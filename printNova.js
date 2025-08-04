export default function printNova( stacks, ast, snippets ) {
	// TODO support snippets
	let firstFact = true
	if (stacks['@include']) {
		for (const fact of stacks['@include']) {
			printInitFact('@include', fact, firstFact)
			firstFact = false
		}
		delete stacks['@include']
	}
	console.log()
	for (const rule of ast) {
		printRule(rule)
	}
	console.log();
	firstFact = true
	for (const stack in stacks) {
		for (const fact of stacks[stack]) {
			printInitFact(stack, fact, firstFact)
		}
		firstFact = false
	}
}

function printInitFact (stack, fact, ruleStartFlag) {
	if (ruleStartFlag) {
		console.log(`|| :${stack}: ${fact.join(' ')}`)
	} else {
		console.log(`   :${stack}: ${fact.join(' ')}`)
	}
}



function printInitFacts (stacks) {
	let firstFact = true
	if (stacks['@include']) {
		for (const fact of stacks['@include']) {
			printInitFact('@include', fact, firstFact)
			firstFact = false
		}
		delete stacks['@include']
	}
	console.log()
	firstFact = true
	for (const stack in stacks) {
		for (const fact of stacks[stack]) {
			printInitFact(stack, fact, firstFact)
		}
		firstFact = false
	}
}

function printRule (rule) {
	let out = '|'
	for (const cause of rule.causes) {
		out += ` :${cause.stack}: `
		if (cause.fact.length != 0)
			out += `${cause.fact.join(' ')}`
		if (cause.keep)
			out += `?`
	}
	out += ' |'
	for (const effect of rule.effects) {
		out += ` :${effect.stack}: `
		if (effect.fact != '')
			out += `${effect.fact.join(' ')}`
	}
	console.log(out)
}

const formatFact = f => `:${f.stack}: ` + f.fact.join(' ');

function printNovaWithVarValues(rules, Var) {
	Reflect.defineProperty(Var.prototype, 'toString', {
		value: function() {
			return this.name;
		}
	})

	for (const rule of rules) {
		// printNova.printRule(rule)
		// console.log(rule)
		let out = ''
		out += '|'
		let log = (...args) => args.forEach(x => out += x)
		for (const cause of rule.causes) {
			log('  ', formatFact(cause))
		}
		log('  |')
		for (const effect of rule.effects) {
			log('  ', formatFact(effect))
		}
		log('\n')
		for (const cause of rule.causes) {
			cause.fact.values().filter(v => v instanceof Var).forEach(
				x => {
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

printNova.printRule = printRule;
printNova.printInitFact = printInitFact;
printNova.printInitFacts = printInitFacts;
printNova.printNovaWithVarValues = printNovaWithVarValues;
