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

printNova.printRule = printRule;
printNova.printInitFact = printInitFact;
printNova.printInitFacts = printInitFacts;
