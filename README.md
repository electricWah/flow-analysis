Flow analysis for Nova. This repo is very rough right now, so here's a summary of what each file is:

 - analyze.js
    - the "main" file for now, up to date
 - gen-conditional-match-check-funcs.js
    - experiment with generating functions to test if rules match (probably not worth it tbh), otherwise the same as analyze.js
 - chain.js
    - oldest file so a bit unrelated, sketch of combining a "chain" of rules that trigger in sequence into a single rule
    - this would be a compiler optimization
 - example.nv
    - small, simple nova program for testing
 - myteParse.js
    - uses myte's parser.js and compiler.js to parse nova into my ast format (i didn't want to write a parser)
 - printNova.js
    - utility library for printing an AST (aka. list of Rules and initial stacks) as valid Nova syntax
 - standalone.js
    - an older version of the analyze.js code so I could have a standalone demo. out of date now tho
