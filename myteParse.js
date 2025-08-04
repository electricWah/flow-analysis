import { readFile } from "node:fs/promises";

// myte parser and compiler
import { handleIncludes, detectSigils, doVars, expandMacros, pullSnippets } from "../compiler.js";
import parser from "../parser.js";
//////////////////////


export function parseInit( classes ) {
	const { Fact, Rule } = classes;
	// TODO
	function makeAst(raw) {
		let rules = raw.ast;
		// TODO implement cause.keep
		rules = rules.map(rule => {
			// might need to reverse keeps, or put on other end of arr
			rule.causes.forEach(c => c.keep && rule.effects.push(c));
			return new Rule(rule.causes.map(cause => new Fact(cause.stack, cause.fact)), 
				rule.effects.map(effect => new Fact(effect.stack, effect.fact.split(' '))))
		})
		return rules;
	}

	async function parseMyteSyntaxFile (path) {
		const code = await readFile(path, "utf-8")
		let rawparsed = await getParsed(code)
		let stacks = rawparsed.stacks
		for (const [stack, items] of Object.entries(stacks)) {
			stacks[stack] = items.map(s=> s.split(' '));
		}
		return {rules: makeAst(rawparsed), stacks: stacks};
	}

	async function parseMyteSyntax (code) {
		let rawparsed = await getParsed(code)
		let stacks = rawparsed.stacks
		for (const [stack, items] of Object.entries(stacks)) {
			stacks[stack] = items.map(s=> s.split(' '));
		}
		return {rules: makeAst(rawparsed), stacks: stacks};
	}
	return { parseMyteSyntax, parseMyteSyntaxFile };

}
// async function main(args) {
// 	let path = args[2]
// 	const code = await readFile(path, "utf-8")
// 	let rawparsed = getParsed(code)
// 	// console.log(rawparsed)
// 	// console.log(JSON.stringify(rawparsed))
// 	console.log(JSON.stringify(makeAst(rawparsed)))
// 	// console.log(makeAst(rawparsed))
// }
// main(process.argv)




// globalThis.libs = libs;



async function getParsed(code) {
	const p = parser();
    let ast = p.parse(code);
	// debugger;
    ast = await handleIncludes(ast, p => readFile(p, "utf-8"), p);
    detectSigils(ast);
    expandMacros(ast);
    let { rules, stacks, snippet } = pullSnippets(ast);
    doVars(rules);
	return {
		ast: rules,
		stacks: stacks,
		snippets: snippet
	}
}



export function printNova(parsed) {
	function printInitFact (stack, fact, ruleStartFlag) {
		if (firstFact) {
			console.log(`|| :${stack}: ${fact}`)
		} else {
			console.log(`   :${stack}: ${fact}`)
		}
	}
	function printRule (rule) {
		let out = '|'
		for (const cause of rule.causes) {
			out += ` :${cause.stack}: `
			if (cause.fact != '')
				out += `${cause.fact}`
			if (cause.keep)
				out += `?`
		}
		out += ' |'
		for (const effect of rule.effects) {
			out += ` :${effect.stack}: `
			if (effect.fact != '')
				out += `${effect.fact}`
		}
		console.log(out)
	}
	let { stacks, ast } = parsed;
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

