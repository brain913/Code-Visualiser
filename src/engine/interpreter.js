import * as acorn from 'acorn';

const MAX_STEPS = 500;
const MAX_LOOP_ITERATIONS = 100;

// Control-flow signals passed up the call stack
class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}
class BreakSignal {}
class ContinueSignal {}

/**
 * Interpret a JavaScript source string and return a list of execution steps.
 *
 * Each step has:
 *   { stepNumber, lineNumber, description, line, variables, output, callStack, isError? }
 *
 * @param {string} code
 * @returns {{ steps: object[], parseError: string|null }}
 */
export function interpret(code) {
  const steps = [];
  let stepCount = 0;
  const lines = code.split('\n');
  const consoleOutput = [];
  const callStack = ['global'];
  /** @type {Record<string, object>} */
  const functionDefs = {};

  // ── Parse ─────────────────────────────────────────────────────────────────
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2020, locations: true });
  } catch (err) {
    return { steps: [], parseError: `Syntax Error: ${err.message}` };
  }

  // Hoist function declarations so they are callable before their definition
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration') {
      functionDefs[node.id.name] = node;
    }
  }

  // ── Environment helpers ───────────────────────────────────────────────────
  const globalEnv = { vars: {}, parent: null, name: 'global' };

  function createEnv(parent, name) {
    return { vars: {}, parent, name };
  }

  function lookupVar(env, name) {
    let e = env;
    while (e) {
      if (Object.prototype.hasOwnProperty.call(e.vars, name)) return e.vars[name];
      e = e.parent;
    }
    return undefined;
  }

  function assignVar(env, name, value) {
    let e = env;
    while (e) {
      if (Object.prototype.hasOwnProperty.call(e.vars, name)) {
        e.vars[name] = value;
        return;
      }
      e = e.parent;
    }
    // Fall back to global scope for undeclared assignments
    globalEnv.vars[name] = value;
  }

  function declareVar(env, name, value) {
    env.vars[name] = value;
  }

  /** Flatten the entire scope chain into a single object (child overrides parent). */
  function flattenEnv(env) {
    const result = {};
    const collect = (e) => {
      if (!e) return;
      collect(e.parent);
      Object.assign(result, e.vars);
    };
    collect(env);
    return result;
  }

  // ── Step capture ──────────────────────────────────────────────────────────
  function captureStep(lineNumber, description, currentEnv) {
    if (stepCount >= MAX_STEPS) throw { isMaxSteps: true };
    stepCount++;
    steps.push({
      stepNumber: stepCount,
      lineNumber,
      description,
      line: lines[lineNumber - 1] || '',
      variables: flattenEnv(currentEnv),
      output: [...consoleOutput],
      callStack: [...callStack],
    });
  }

  // ── Value formatting ──────────────────────────────────────────────────────
  /** Format for variable display (strings get quotes). */
  function formatVal(val) {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'object') {
      try { return JSON.stringify(val); } catch { return '[Object]'; }
    }
    return String(val);
  }

  /** Format for console.log output (strings without quotes). */
  function printVal(val) {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'object') {
      try { return JSON.stringify(val); } catch { return '[Object]'; }
    }
    return String(val);
  }

  // ── Statement execution ───────────────────────────────────────────────────
  function executeBlock(stmts, env) {
    for (const stmt of stmts) {
      const result = executeStatement(stmt, env);
      if (
        result instanceof ReturnSignal ||
        result instanceof BreakSignal ||
        result instanceof ContinueSignal
      ) {
        return result;
      }
    }
    return null;
  }

  function executeStatement(node, env) {
    switch (node.type) {
      // ── Variable declaration ─────────────────────────────────────────────
      case 'VariableDeclaration': {
        for (const decl of node.declarations) {
          const name = decl.id.name;
          const value = decl.init ? evalExpr(decl.init, env) : undefined;
          declareVar(env, name, value);
          captureStep(
            node.loc.start.line,
            `${node.kind} ${name} = ${formatVal(value)}`,
            env,
          );
        }
        return null;
      }

      // ── Expression statement ─────────────────────────────────────────────
      case 'ExpressionStatement':
        return executeExprStmt(node.expression, env);

      // ── If / else ────────────────────────────────────────────────────────
      case 'IfStatement': {
        const cond = evalExpr(node.test, env);
        const condStr = formatCondition(node.test, env);
        captureStep(
          node.loc.start.line,
          `if (${condStr}) → ${cond ? 'true ✓' : 'false ✗'}`,
          env,
        );
        if (cond) return executeStatement(node.consequent, env);
        if (node.alternate) return executeStatement(node.alternate, env);
        return null;
      }

      // ── For loop ─────────────────────────────────────────────────────────
      case 'ForStatement': {
        const forEnv = createEnv(env, 'for');
        // Init
        if (node.init) {
          if (node.init.type === 'VariableDeclaration') {
            for (const decl of node.init.declarations) {
              const name = decl.id.name;
              const value = decl.init ? evalExpr(decl.init, forEnv) : undefined;
              declareVar(forEnv, name, value);
              captureStep(
                node.loc.start.line,
                `for init: ${node.init.kind} ${name} = ${formatVal(value)}`,
                forEnv,
              );
            }
          } else {
            executeExprStmt(node.init, forEnv);
          }
        }
        let iter = 0;
        while (true) {
          if (++iter > MAX_LOOP_ITERATIONS) {
            captureStep(
              node.loc.start.line,
              `⚠ Loop stopped after ${MAX_LOOP_ITERATIONS} iterations`,
              forEnv,
            );
            break;
          }
          // Test
          if (node.test) {
            const cond = evalExpr(node.test, forEnv);
            captureStep(
              node.loc.start.line,
              `for (${formatCondition(node.test, forEnv)}) → ${cond}`,
              forEnv,
            );
            if (!cond) break;
          }
          const result = executeStatement(node.body, forEnv);
          if (result instanceof BreakSignal) break;
          if (result instanceof ReturnSignal) return result;
          // Update
          if (node.update) executeExprStmt(node.update, forEnv);
        }
        return null;
      }

      // ── While loop ───────────────────────────────────────────────────────
      case 'WhileStatement': {
        let iter = 0;
        while (true) {
          if (++iter > MAX_LOOP_ITERATIONS) {
            captureStep(
              node.loc.start.line,
              `⚠ Loop stopped after ${MAX_LOOP_ITERATIONS} iterations`,
              env,
            );
            break;
          }
          const cond = evalExpr(node.test, env);
          captureStep(
            node.loc.start.line,
            `while (${formatCondition(node.test, env)}) → ${cond}`,
            env,
          );
          if (!cond) break;
          const result = executeStatement(node.body, env);
          if (result instanceof BreakSignal) break;
          if (result instanceof ReturnSignal) return result;
        }
        return null;
      }

      // ── Block ────────────────────────────────────────────────────────────
      case 'BlockStatement':
        return executeBlock(node.body, env);

      // ── Return ───────────────────────────────────────────────────────────
      case 'ReturnStatement': {
        const value = node.argument ? evalExpr(node.argument, env) : undefined;
        captureStep(node.loc.start.line, `return ${formatVal(value)}`, env);
        return new ReturnSignal(value);
      }

      case 'BreakStatement':
        return new BreakSignal();

      case 'ContinueStatement':
        return new ContinueSignal();

      // ── Function declaration (already hoisted) ───────────────────────────
      case 'FunctionDeclaration':
        captureStep(
          node.loc.start.line,
          `function ${node.id.name}(${node.params.map((p) => p.name).join(', ')}) defined`,
          env,
        );
        return null;

      default:
        return null;
    }
  }

  /**
   * Execute an expression that appears as a statement (assignment, call, update).
   * Returns the evaluated value.
   */
  function executeExprStmt(node, env) {
    switch (node.type) {
      // ── Assignment ───────────────────────────────────────────────────────
      case 'AssignmentExpression': {
        const rhs = evalExpr(node.right, env);
        const line = node.loc.start.line;
        let finalValue = rhs;

        if (node.left.type === 'Identifier') {
          const name = node.left.name;
          if (node.operator !== '=') {
            const old = lookupVar(env, name);
            switch (node.operator) {
              case '+=': finalValue = old + rhs; break;
              case '-=': finalValue = old - rhs; break;
              case '*=': finalValue = old * rhs; break;
              case '/=': finalValue = old / rhs; break;
              case '%=': finalValue = old % rhs; break;
              default: finalValue = rhs;
            }
          }
          assignVar(env, name, finalValue);
          captureStep(
            line,
            `${name} ${node.operator} ${formatVal(rhs)} → ${name} = ${formatVal(finalValue)}`,
            env,
          );
        } else if (node.left.type === 'MemberExpression') {
          const obj = evalExpr(node.left.object, env);
          const prop = node.left.computed
            ? evalExpr(node.left.property, env)
            : node.left.property.name;
          if (obj !== null && obj !== undefined) obj[prop] = finalValue;
          const objName =
            node.left.object.type === 'Identifier' ? node.left.object.name : '(obj)';
          captureStep(line, `${objName}[${prop}] = ${formatVal(finalValue)}`, env);
        }
        return finalValue;
      }

      // ── Update (i++, i--) ────────────────────────────────────────────────
      case 'UpdateExpression': {
        const name = node.argument.name;
        const old = lookupVar(env, name);
        const newVal = node.operator === '++' ? old + 1 : old - 1;
        assignVar(env, name, newVal);
        captureStep(
          node.loc.start.line,
          `${name}${node.operator} → ${name} = ${newVal}`,
          env,
        );
        return node.prefix ? newVal : old;
      }

      // ── Function/method call ─────────────────────────────────────────────
      case 'CallExpression':
        return executeCall(node, env);

      default:
        return evalExpr(node, env);
    }
  }

  /** Execute a function call node and return its return value. */
  function executeCall(node, env) {
    const line = node.loc.start.line;
    const args = node.arguments.map((a) => evalExpr(a, env));

    // console.log
    if (
      node.callee.type === 'MemberExpression' &&
      node.callee.object.type === 'Identifier' &&
      node.callee.object.name === 'console' &&
      node.callee.property.name === 'log'
    ) {
      const logStr = args.map(printVal).join(' ');
      consoleOutput.push(logStr);
      captureStep(line, `console.log → "${logStr}"`, env);
      return undefined;
    }

    // Resolve callee
    let funcName = 'anonymous';
    let funcDef = null;
    if (node.callee.type === 'Identifier') {
      funcName = node.callee.name;
      funcDef = functionDefs[funcName] ?? lookupVar(env, funcName);
    }

    if (!funcDef || typeof funcDef !== 'object' || !funcDef.type) {
      captureStep(line, `⚠ "${funcName}" is not a defined function`, env);
      return undefined;
    }

    const argsStr = args.map(formatVal).join(', ');
    const callLabel = `${funcName}(${argsStr})`;

    // Create a new scope for the function, parented to global (closure approximation)
    const funcEnv = createEnv(globalEnv, funcName);
    for (let i = 0; i < funcDef.params.length; i++) {
      funcEnv.vars[funcDef.params[i].name] = args[i];
    }

    callStack.push(callLabel);
    captureStep(line, `→ call ${callLabel}`, funcEnv);

    let returnValue = undefined;
    const result = executeBlock(funcDef.body.body, funcEnv);
    if (result instanceof ReturnSignal) returnValue = result.value;

    callStack.pop();
    captureStep(line, `← return from ${funcName}: ${formatVal(returnValue)}`, env);

    return returnValue;
  }

  // ── Expression evaluation ─────────────────────────────────────────────────
  function evalExpr(node, env) {
    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Identifier': {
        // Special globals
        if (node.name === 'undefined') return undefined;
        if (node.name === 'NaN') return NaN;
        if (node.name === 'Infinity') return Infinity;
        return lookupVar(env, node.name);
      }

      case 'BinaryExpression': {
        const l = evalExpr(node.left, env);
        const r = evalExpr(node.right, env);
        switch (node.operator) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/': return l / r;
          case '%': return l % r;
          case '**': return l ** r;
          case '===': return l === r;
          case '!==': return l !== r;
          case '==': return l == r;
          case '!=': return l != r;
          case '<': return l < r;
          case '>': return l > r;
          case '<=': return l <= r;
          case '>=': return l >= r;
          case '&': return l & r;
          case '|': return l | r;
          case '^': return l ^ r;
          default: return undefined;
        }
      }

      case 'UnaryExpression': {
        if (node.operator === 'typeof') {
          if (node.argument.type === 'Identifier') {
            return typeof lookupVar(env, node.argument.name);
          }
          return typeof evalExpr(node.argument, env);
        }
        const val = evalExpr(node.argument, env);
        switch (node.operator) {
          case '-': return -val;
          case '+': return +val;
          case '!': return !val;
          case '~': return ~val;
          default: return undefined;
        }
      }

      case 'LogicalExpression': {
        const l = evalExpr(node.left, env);
        switch (node.operator) {
          case '&&': return l ? evalExpr(node.right, env) : l;
          case '||': return l ? l : evalExpr(node.right, env);
          case '??': return l != null ? l : evalExpr(node.right, env);
          default: return undefined;
        }
      }

      case 'AssignmentExpression':
        return executeExprStmt(node, env);

      case 'UpdateExpression':
        return executeExprStmt(node, env);

      case 'CallExpression':
        return executeCall(node, env);

      case 'ConditionalExpression':
        return evalExpr(node.test, env)
          ? evalExpr(node.consequent, env)
          : evalExpr(node.alternate, env);

      case 'TemplateLiteral': {
        let result = '';
        for (let i = 0; i < node.quasis.length; i++) {
          result += node.quasis[i].value.cooked || '';
          if (i < node.expressions.length) {
            result += printVal(evalExpr(node.expressions[i], env));
          }
        }
        return result;
      }

      case 'ArrayExpression':
        return node.elements.map((e) => (e ? evalExpr(e, env) : undefined));

      case 'ObjectExpression': {
        const obj = {};
        for (const prop of node.properties) {
          const key =
            prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
          obj[key] = evalExpr(prop.value, env);
        }
        return obj;
      }

      case 'MemberExpression': {
        const obj = evalExpr(node.object, env);
        const prop = node.computed
          ? evalExpr(node.property, env)
          : node.property.name;
        if (obj == null) return undefined;
        return obj[prop];
      }

      default:
        return undefined;
    }
  }

  // ── Condition formatting ──────────────────────────────────────────────────
  function formatCondition(node, env) {
    try {
      if (node.type === 'BinaryExpression') {
        return `${fmtPart(node.left, env)} ${node.operator} ${fmtPart(node.right, env)}`;
      }
      if (node.type === 'LogicalExpression') {
        return `${fmtPart(node.left, env)} ${node.operator} ${fmtPart(node.right, env)}`;
      }
      if (node.type === 'Identifier') {
        const v = lookupVar(env, node.name);
        return v !== undefined ? `${node.name}(${formatVal(v)})` : node.name;
      }
      if (node.type === 'Literal') return formatVal(node.value);
      if (node.type === 'UnaryExpression') {
        return `${node.operator}${fmtPart(node.argument, env)}`;
      }
    } catch { /* ignore */ }
    return '...';
  }

  function fmtPart(node, env) {
    if (node.type === 'Literal') return formatVal(node.value);
    if (node.type === 'Identifier') {
      try {
        const v = lookupVar(env, node.name);
        return v !== undefined ? `${node.name}(${formatVal(v)})` : node.name;
      } catch { return node.name; }
    }
    try { return formatVal(evalExpr(node, env)); } catch { return '...'; }
  }

  // ── Run ───────────────────────────────────────────────────────────────────
  try {
    executeBlock(ast.body, globalEnv);
  } catch (err) {
    if (!err.isMaxSteps) {
      steps.push({
        stepNumber: steps.length + 1,
        lineNumber: 0,
        description: `❌ Runtime Error: ${err.message}`,
        line: '',
        variables: flattenEnv(globalEnv),
        output: [...consoleOutput],
        callStack: [...callStack],
        isError: true,
      });
    }
  }

  return { steps, parseError: null };
}
