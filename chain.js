import { inspect } from 'util'; // or: import util from 'util'

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
		value.forEach(x => console.log('\t',x))
	})
	console.log()
}

const isVar = v => typeof v == 'string' && v.startsWith('$');

let stacks = {}
let push = (stack, item) => {
	stacks[stack] ??= [];
	stacks[stack].push(item)
}
let pop = (stack) => stacks[stack].pop();


// function Fact(stack, items) { return { stack: stack, fact: items.split(' ') } };

class Fact {
	stack;
	fact;
	constructor(stack, items) {
		this.stack  = stack;
		this.fact = 
			typeof items == 'string' ? items.split(' ') : items;
	}

}

// const Rule = (causes, effects) => { return { causes: causes, effects: effects } };
class Rule {
	causes;
	effects;
	constructor(causes, effects) {
		this.causes  = causes;
		this.effects = effects;
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
		console.log('called')
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



// rule effects and causes must be in the correct order for popping and pushing
// strides, kept causes, etc. must be compiled to plain facts
// ie. a kept cause should be added to front the effects side 

function doRule(rule) {
	let vars = {}
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
		console.log('effect:', effect)
		let fact = Array.from(effect.fact); // copy
		for (let i = 0; i < fact.length; i++) {
			if (isVar(fact[i])) {
				if (fact[i] in vars) {
					fact[i] = vars[fact[i]];
				} else {
					fact[i] = new VarPlaceholder('Generated var');
				}

			} else if (fact[i] instanceof PortResultPlaceholder) {
				fact[i].giveVars(vars);
			} 
		}
		push(effect.stack, fact);
	}
}

/**
* @param {Fact[]} causes
*/
function pushMockMatch(causes) {
	for (let cause of causes) {
		let fact = cause.fact.map(x => isVar(x) ? new VarPlaceholder(x) : x);
		push(cause.stack, fact);
	}
}


let chain = [
new Rule([new Fact('', '$v a b c')], [new Fact('', 'a $v b c')]),
new Rule([new Fact('', 'a $v b c')], [new Fact('', 'a b $v c')]),
new Rule([new Fact('', 'a b $v c')], [new Fact('', 'a b c $v')]),
new Rule([new Fact('', 'a b c $v')], [new Fact('', 'result $v')]),
//*
// new Rule([new Fact('@math', 'add $a $b')], [new PortResultPlaceholder('@math add', 1)])
//	*/
];
// console.log(new PortResultPlaceholder('@math add', 1))
let first = chain[0];
pushMockMatch(first.causes);

console.log('initial stacks')
printStacks(stacks)

chain.forEach(doRule);
// let finalEffect = effectFromStack();
// let compressedRule = Rule(first.causes, finalEffect);

// chain.forEach(doRule);
// // console.log(stacks)

console.log('end stacks')
printStacks(stacks)
// console.log(makeEffectsThatGeneratesCurrentStacks(stacks))
