import { inspect } from 'util'; // or: import util from 'util'
import printNova from './printNova.js';
import { parseInit } from './myteParse.js'

let factId = 0;
class Fact {
	stack;
	fact;
	// vars = new Set();
	id = factId++;
	constructor(stack, items) {
		let tmp;
		this.stack  = stack;
		this.fact = 
			(typeof items == 'string' ? items.split(' ') : items)
		// .map(x => isVar(x) ? (tmp=new Var(x), vars.add(tmp), tmp) : x);
	}
}


// const Rule = (causes, effects) => { return { causes: causes, effects: effects } };
let ruleId = 0;
class Rule {
	causes;
	effects;
	id = ruleId++;
	constructor(causes, effects) {
		this.causes  = causes;
		this.effects = effects;
		// let vars = {}
		// this.causes.forEach(fact => fact.fact = fact.fact.map(
		// tok => isVar(tok) ? (vars[tok] = new Var(tok)) : tok))

		// this.effects.forEach(fact => fact.fact = fact.fact.map(
		// tok => isVar(tok) ? (vars[tok] ?? new GeneratedVar(tok)) : tok))
	}
}

let generatedVarId = 0;
class GeneratedVar {
	name;
	id = generatedVarId++;
	constructor(name) {
		this.name = name;
	}

	toString() {
		return `GeneratedVar(${this.name})`;
	}

	generate() {
		return `GeneratedSymbol${this.id}(${this.name})`;
	}
}

class Var {
	name;
	constructor(name) {
		this.name = name;
	}

	toString() {
		return `Var(${this.name})`;
	}
}

class VarPlaceholder {
	name;
	constructor(name) {
		this.name = name;
	}
}

class PortResultPlaceholder {
	name;
	vars = {};
	constructor(name, varsNeeded) {
		this.name = name;
		for (const v of varsNeeded) {
			this.vars[v] = null;
		}
	}

	// can also make a PortCause object to get var values
	// then it would directly pop them during doRule
	giveVars(vars) {
		// console.log('called')
		for (const v in this.vars) {
			this.vars[v] = vars[v];
		}
	}
}

class PortRule {
	name;
	constructor(name) {
		this.name = name;
	}
}



class PortEffect extends Array {
	name;
	constructor(name, length) {
		super(1);
		this.name = name;
		this[0] = new Fact();
		for (let i = 0; i < length; i++) {
			this[0][i] = new VarPlaceholder(name + i);
		}
	}
}

function sugar(s, b) {
	if (typeof b == 'string') {
		return new Rule(s.split('|').map(sugar), b.split('|').map(sugar));
	}

	let a = s.split(':');
	let stack = a[0].trim();
	let fact = a[1].trim().split(' ')
	return new Fact(stack, fact);
}


// Set the default depth to null to remove the recursion limit.
// All  subsequent console.log() and console.dir() calls will use this default.
inspect.defaultOptions.depth = 5


/**
 * @param {string} items
 * @param {string} stack
 */

function printStacks(stacks) {
	Object.entries(stacks).forEach(([key, value]) => {
		console.log(':' + key + ':');
		value.toReversed().forEach(x => console.log('\t',x))
	})
	console.log()
}

let isVar = v => (typeof v == 'string' && v.startsWith('$'));

// let stacks = {}
const { parseMyteSyntaxFile, parseMyteSyntax } = parseInit({Rule, Fact});
let { rules, stacks } = await parseMyteSyntaxFile('./greek-salad.nv')
debugger;
let push = (stack, item) => {
	if (!item && typeof stack == "string") stack = sugar(stack)
	if (stack instanceof Fact) {
		item = stack.fact;
		stack = stack.stack
	}
	stacks[stack] ??= [];
	stacks[stack].push(item)
}
let pop = (stack) => stacks[stack].pop();


// function Fact(stack, items) { return { stack: stack, fact: items.split(' ') } };




// isVar = v => v instanceof Var;
// rule effects and causes must be in the correct order for popping and pushing
// strides, kept causes, etc. must be compiled to plain facts
// ie. a kept cause should be added to front the effects side 

function matchCause(cause, stacks) {
	if (!stacks[ cause.stack ])
		return false;
	let pattern = cause.fact;
	let stackTop = stacks[ cause.stack ][0];
	for (let i = 0; i < pattern.length; i++) {
		if (isVar(pattern[i]))
			continue;
		if (pattern[i] != stackTop[i])
			return false;
	}
	return true;
}

function doRule(rule) {
	let vars = {}
	for (const cause of rule.causes) {
		if (!matchCause(cause, stacks))
			return false;
	}
	for (const cause of rule.causes) {
		// console.log('cause:', cause)
		let v = pop(cause.stack)
		// console.log(v)
		let pattern = cause.fact;
		for (let i = 0; i < pattern.length; i++) {
			let item = pattern[i];
			if (isVar(item)) {
				vars[item] = v[i];
			}
		}
	}
	// console.log(vars)
	for (const effect of rule.effects) {
		// console.log('effect:', effect)
		let fact = Array.from(effect.fact); // copy
		for (let i = 0; i < fact.length; i++) {
			if (isVar(fact[i])) {
				fact[i] = vars[fact[i]];
			} else if (fact[i] instanceof GeneratedVar) {
				fact[i] = new VarPlaceholder('Generated var');
			} 			
		}
		push(effect.stack, fact);
	}
	return true;
}


/**
 * @param {Fact} fact
 * @param {Rule} rule
 */
// const testedCache();

const matchTypes = {
	unconditional: 'unconditional',
	conditional: 'conditional',
	noMatch: false
}

function couldMatch(fact, rule) {
	causeLoop:
	for (const cause of rule.causes) {
		if (fact.stack != cause.stack) continue;
		if (fact.fact.length != cause.fact.length) continue;
		let pattern = cause.fact;
		let matchType = matchTypes.unconditional;
		for (let i = 0; i < pattern.length; i++) {
			// vars match anything
			if (isVar(pattern[i]))  
				continue

			// unknown if fact var will match
			// can deduce possible tokens and reject the match here
			if (isVar(fact.fact[i])) {
				// is this correct? Ans: YES!
				// we reject the match bc the var doesn't have the pattern
				// symbol, but what if it just hasn't propagated yet?
				// ---
				// This is actually what we want. We want to delay matching until the right symbol has propagated. The system keps running until all values are propagated (ie. fixpoint is reached), so if it is possible to propagate, *it will propagate and match eventually*. If we don't wait until then, we will match places we shouldn't. We only allow matches conservatively if the symbol propagation hasn't started yet.
				// NOTE if value matches, it might be promoted to an unconditional match. The semantics are a bit weird but it works
				if (fact.fact[i].potentialValues && !fact.fact[i].potentialValues.has(pattern[i]))
					continue causeLoop;
				matchType = matchTypes.conditional;
				continue
			}

			if (fact.fact[i] != pattern[i])
				continue causeLoop;
		}
		return matchType;
	}
	return false;
}

function genMatchTest(fact, rule) {
	let causeMatchFuncs = []
	causeLoop:
	for (const cause of rule.causes) {
		if (fact.stack != cause.stack) continue;
		if (fact.fact.length != cause.fact.length) continue;
		let pattern = cause.fact;
		let matchType = matchTypes.unconditional;

		let varMatchFuncs = [];
		for (let i = 0; i < pattern.length; i++) {
			if (isVar(pattern[i]))  
				continue

			if (isVar(fact.fact[i])) {
				matchType = matchTypes.conditional;

				{
					const factVar = fact.fact[i];
					const patSymbol = pattern[i];
					varMatchFuncs.push(() => !factVar?.potentialValues.has(patSymbol))
				}
				continue
			}

			if (fact.fact[i] != pattern[i])
				continue causeLoop;
		}
		if (matchType == matchTypes.conditional) {
			causeMatchFuncs.push(() => varMatchFuncs.every(x=>x()))
		}
	}
	
	return () => causeMatchFuncs.some(x=>x());
}

/**
 * @param {Fact} fact
 * @param {Rule} rule
 */
function propagate(fact, rule) {
	let stack = fact.stack;
	fact = fact.fact;
	for (const cause of rule.causes) {
		if (stack != cause.stack) continue;
		let pattern = cause.fact;
		if (fact.length != pattern.length) continue;
		for (let i = 0; i < pattern.length; i++) {
			// vars match anything
			if (isVar(pattern[i]))  
			{
				pattern[i].potentialValues ??= new Set();
				if (isVar(fact[i])) {
					if (!fact[i].potentialValues)
						throw new Error('you should only be propagating vars that were triggered by other facts');
					fact[i].potentialValues.forEach(
						x=>pattern[i].potentialValues.add(x))
				} else {
					pattern[i].potentialValues.add(fact[i]);
				}
			}

			// unknown if fact var will match
			// TODO optimize by tracing flow of symbols
			// can deduce possible tokens and reject the match here
		}
	}
}



// let rules = parseMyteSyntax(`
// | :start:  yoyoyo :: num $x | :: processed $x
// | :: do thing $x | :: num $x
// | :: other thing $x | :: num $x
// | :: other thing $x $y | :: $y $x
// | :: processed $x | :: num $x
// `)


// let rules = [ 
// 	new Rule([new Fact('', '$v a b c')], [new Fact('', 'a $v b c')]),
// 	new Rule([new Fact('', 'a $v b c')], [new Fact('', 'a b $v c')]),
// 	new Rule([new Fact('', 'a b $v c')], [new Fact('', 'a b c $v')]),
// 	new Rule([new Fact('', 'a b c $v')], [new Fact('', 'result $v')]),
// ]

/** 
 * @type {Rule[]} rules
 */
/*
let rules = [
	// sugar('start: yoyoyo | : num $x', ': processed $x'),
	// sugar(': do thing $x', ': num $x'),
	// sugar(': other thing $x', ': num $x'),
	// sugar(': other thing $x $y', ': $y $x'),
	// sugar(': processed $x','out: $x | : num $x'),

	sugar('testtrigger: $x ', 'test: $x $gen'),
	sugar('test: unique $val', 'testout: triggered $val'),
	sugar('testout: $x $_', 'testout: yo terminate terminate'),
];

push('testtrigger: yoyoyo')
push('testtrigger: unique')
//*/

// push(': 1 a b c')
// push(': a 2 b c')
// push(': a b 3 c')
// push(': a b c 4')
// push('start: yoyoyo')
// push(': num 5')
// push(': num 6')
// push(': num 7')

////// dynamic language shenanigans
for (let rule of rules) {
	let vars = {}
	rule.causes.forEach(fact => fact.fact = fact.fact.map(
		tok => isVar(tok) ? (vars[tok] = new Var(tok)) : tok))

	rule.effects.forEach(fact => fact.fact = fact.fact.map(
		tok => isVar(tok) ? (vars[tok] ?? new GeneratedVar(tok)) : tok))
}
isVar = v => v instanceof Var;
//////

//console.log('initial stacks')
// printStacks(stacks)


////////////////////

// TODO
// test each initial fact against each rule cause

// if a cause matches, add the matching token to each var's list 
// of potential matches and propagate that to the effects

// console.log(rules[0])
// console.log(couldMatch(new Fact('', stacks[''][0]), rules[0]))
// console.log(rules)

// only possible values are propagated
// additional symbols not represented in the source code (ie. from ports, external input) need to be added here 
// should be possible to represent types like 'integers' or 'numbers'
let toPropagate = new Set();

// initialize propagation list with the initial facts
for (const [stack, items] of Object.entries(stacks)) {
	items.forEach(fact => toPropagate.add(new Fact(stack, fact)))
}

let numOfSymbolsInVars = new Map();
let getNumOfSymbolsInVars = 
	({fact}) => 
	fact.reduce((a, x) => isVar(x) && x.potentialValues?.size + a || a, 0);
function markPropagated (fact) {
	// true marks constant facts
	numOfSymbolsInVars.set(fact, getNumOfSymbolsInVars(fact) || true);
}

function shouldBePropagated (fact) {
	const a = numOfSymbolsInVars.get(fact);
	const b = getNumOfSymbolsInVars(fact);
	if (!a) {
		return true;
	}
	if (b == 0) {
		return false;
	}

	if (a > b) throw new Error('fact somehow lost symbols? where did they go?')
	if (a == b) return false;

	// if a < b
	numOfSymbolsInVars.set(fact, b);
	return true;
}

let comparisons = 0;
debugger;
for (let fact of toPropagate.values()) {
	toPropagate.delete(fact);
	if (!shouldBePropagated(fact)) {
		continue;
	}

	let propagated = false;
	
	// fact.nextRules ??= Object.groupBy(rules, rule => couldMatch(fact, rule))
	// delete fact.nextRules.false; // remove non-matches
	
	//*
	// does the same thing as the above 2 lines
	if (!fact.nextRules) {
		fact.nextRules = {};
		fact.nextRules.conditional = [];
		fact.nextRules.unconditional = [];
		fact.checkConditionalFuncs = new Map();
		for (const rule of rules) {
			comparisons++;
			switch (couldMatch(fact, rule)) {
				case matchTypes.conditional:				 
					fact.nextRules.conditional.push(rule);
					fact.checkConditionalFuncs[rule] = genMatchTest(fact, rule)
					break;
				case matchTypes.unconditional:				 
					fact.nextRules.unconditional.push(rule);
					break;
			}
		}
	}
	//*/

	function propagateRule (fact, rule) {
		propagate(fact, rule);
		// debugger;
		rule.effects.forEach(x => toPropagate.add(x));
		rule.triggered = true;
		fact.propagated = true;
		propagated = true;
	}
	if (fact.nextRules.unconditional) {
		for (const rule of fact.nextRules.unconditional) {
			propagateRule(fact, rule)
		}
	}
	if (fact.nextRules.conditional) {
		let conditioni = 0;
		for (const rule of fact.nextRules.conditional) { 
			comparisons++;
			if (couldMatch(fact, rule)) {
			// if (fact.checkConditionalFuncs[rule]()) {
				propagateRule(fact, rule)
				// NOTE we don't need to test this rule again,
				// so we can promote it to unconditional
				delete fact.nextRules.conditional[conditioni];
				fact.nextRules.unconditional.push(rule);
			}
			conditioni++;
		}
	}
	if (propagated)
		markPropagated(fact);
}
console.error("comparisons:", comparisons)
debugger;
// i'm 90% sure that according to the Set.values() spec, the above loop terminating
// means the system is at fixed point (ie. it's done cooking). need to verify
// though


// repopulate flow graph of rules now that var domains are known
for (const rule of rules) {
	rule.nextRules = [];
	for (const effect of rule.effects) {
		for (const rule2 of rules) {
			if (couldMatch(effect, rule2)) {
				rule.nextRules.push(rule2);
			}
		}
	}
}

/*
{
	// dead code removal
	//// console.log(rules)
	let aliveRules = rules.filter(x => x.triggered);
	//console.log(aliveRules.length, rules.length)

	// // console.log(toPropagate)
	 for (const rule of aliveRules) {
		 for (const effect of rule.effects) {
			 for (let i = 0; i < aliveRules.length; i++) {
				 if (couldMatch(effect, aliveRules[i])) {
					 if (shouldBePropagated(effect)) {
	//					 console.log('uh oh')
						 propagate(effect, aliveRules[i])
					 }
				 }
			 }
		 }
	//	 // console.log(rule.effects)
	//	 // console.log(rule.nextRules)
	 }
}
*/
//// console.log(rules)
////////////////////
// rules.forEach(doRule);

//console.log('end stacks')
printStacks(stacks)


Reflect.defineProperty(Var.prototype, 'toString', { value: function() {
	return this.name;
}})

// printNova(stacks, rules);
//// console.log(stacks[''].pop())

// for (const [stack, items] of Object.entries(stacks)) {
// 	items.forEach(fact => toPropagate.add(new Fact(stack, fact)))
// }

// for (const rule of rules) {
// 	printNova.printRule(rule)
// 	for (const cause of rule.causes) {
//// 		console.log(cause)
// 		cause.fact.values().filter(isVar).forEach(
//// 			x=> console.log(x)
// 		)
// 	}
// }

 
const formatFact = f => `:${f.stack}: ` + f.fact.join(' ');

function printNovaWithVarValues() {
	for (const rule of rules) {
		// printNova.printRule(rule)
		// console.log(rule)
		let out = ''
		out+='|'
		let log = (...args) => args.forEach(x=>out+=x)
		for (const cause of rule.causes) {
			log('  ', formatFact(cause))
		}
		log('  |')
		for (const effect of rule.effects) {
			log('  ', formatFact(effect))
		}
		log('\n')
		for (const cause of rule.causes) {
			cause.fact.values().filter(isVar).forEach(
			x=> {
				if (x.potentialValues)
					log('  |# ', x.name, '=', Array.from(x.potentialValues))
				else 
					log('  |# ', x.name)
				log(' #|\n')
			}
			)
		}
		console.log(out)
	}
}

// 0,.g;console\.log;norm I//

//*
printNovaWithVarValues()
printNova.printInitFacts(stacks)
//*/
