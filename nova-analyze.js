// {{{
import printNova from './printNova.js';
let factId = 0;
export class Fact {
	stack;
	fact;
	// vars = new Set();
	id = factId++;
	constructor(stack, items) {
		this.stack  = stack;
		this.fact = 
			(typeof items == 'string' ? items.split(' ') : items)
		// .map(x => isVar(x) ? (tmp=new Var(x), vars.add(tmp), tmp) : x);
	}
}


// const Rule = (causes, effects) => { return { causes: causes, effects: effects } };
let ruleId = 0;
export class Rule {
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
export class GeneratedVar {
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

export class Var {
	name;
	constructor(name) {
		this.name = name;
	}

	toString() {
		return `Var(${this.name})`;
	}
}


// rule effects and causes must be in the correct order for popping and pushing
// strides, kept causes, etc. must be compiled to plain facts
// ie. a kept cause should be added to front the effects side 


function printStacks(stacks) {
	Object.entries(stacks).forEach(([key, value]) => {
		console.log(':' + key + ':');
		value.toReversed().forEach(x => console.log('\t',x))
	})
	console.log()
}

function isVar (v) {
	return v instanceof Var;
}

function processRulesVars(rules) {
	let isVarString = v => (typeof v == 'string' && v.startsWith('$'));
	////// dynamic language shenanigans
	for (let rule of rules) {
		let vars = {}
		rule.causes.forEach(fact => fact.fact = fact.fact.map(
			tok => isVarString(tok) ? (vars[tok] = new Var(tok)) : tok))

		rule.effects.forEach(fact => fact.fact = fact.fact.map(
			tok => isVarString(tok) ? (vars[tok] ?? new GeneratedVar(tok)) : tok))
	}
}

const matchTypes = {
	unconditional: 'unconditional',
	conditional: 'conditional',
	noMatch: false
}

/**
 * @param {Fact} fact
 * @param {Rule} rule
 */
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

// }}}
export function doPropagation(rules, stacks) {
	printStacks(stacks); // TODO remove

	processRulesVars(rules);
	//////
	debugger;



	// only possible values are propagated
	// additional symbols not represented in the source code (ie. from ports, external input) need to be added here 
	// should be possible to represent types like 'integers' or 'numbers'
	let toPropagate = new Set();

	// initialize propagation list with the initial facts
	for (const [stack, items] of Object.entries(stacks)) {
		items.forEach(fact => toPropagate.add(new Fact(stack, fact)))
	}

	const numOfSymbolsInVars = new Map();
	const getNumOfSymbolsInVars = 
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

		function propagateRule (fact, rule) {
			propagate(fact, rule);
			// debugger;
			rule.effects.forEach(x => toPropagate.add(x));
			rule.triggered = true;
			fact.propagated = true;
			propagated = true;
		}

		toPropagate.delete(fact);
		if (!shouldBePropagated(fact)) {
			continue;
		}

		let propagated = false;

		fact.nextRules ??= Object.groupBy(rules, rule => (comparisons++, couldMatch(fact, rule)))
		delete fact.nextRules.false; // remove non-matches

		/*
			// does the same thing as the above 2 lines
	if (!fact.nextRules) {
		fact.nextRules = {};
		fact.nextRules.conditional = [];
		fact.nextRules.unconditional = [];
		for (const rule of rules) {
			comparisons++;
			switch (couldMatch(fact, rule)) {
				case matchTypes.conditional:				 
					fact.nextRules.conditional.push(rule);
					break;
				case matchTypes.unconditional:				 
					fact.nextRules.unconditional.push(rule);
					break;
			}
		}
	}
		//*/

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
					propagateRule(fact, rule)
					// NOTE we don't need to test this rule again,
					// so we can promote it to unconditional
					delete fact.nextRules.conditional[conditioni];
					fact.nextRules.unconditional ??= [];
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

	//console.log('end stacks')
	// printStacks(stacks)

	// 0,.g;console\.log;norm I//

	/*
	printNovaWithVarValues(rules)
	printNova.printInitFacts(stacks)
	//*/
	// }}}

	return {rules, stacks}
}

// TODO other stuff - to be removed {{{
// ================================

const formatFact = f => `:${f.stack}: ` + f.fact.join(' ');

function printNovaWithVarValues(rules) {
	Reflect.defineProperty(Var.prototype, 'toString', { value: function() {
		return this.name;
	}})

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


// {
// 	// FIXME temp
// 	// let stacks = {}
// 	const { parseMyteSyntaxFile } = parseInit({Rule, Fact});
// 	let { rules, stacks } = await parseMyteSyntaxFile('./greek-salad.nv')
// 	doPropagation(rules, stacks);
// }
