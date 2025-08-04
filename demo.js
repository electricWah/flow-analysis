import { parseInit } from './myteParse.js';
import { Fact, Rule, GeneratedVar, Var, doPropagation } from './nova-analyze.js';
import printNova from './printNova.js';

const { parseMyteSyntaxFile } = parseInit({ Rule, Fact });
// let { rules, stacks } = await parseMyteSyntaxFile('./greek-salad.nv')
let { rules, stacks } = await parseMyteSyntaxFile('./example.nv')
doPropagation(rules, stacks);


printNova.printNovaWithVarValues(rules, Var)
printNova.printInitFacts(stacks)
