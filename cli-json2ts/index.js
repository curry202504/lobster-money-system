#!/usr/bin/env node

/**
 * json2ts — Convert JSON to TypeScript type definitions
 * 
 * Usage:
 *   json2ts data.json                 # Output to stdout
 *   json2ts data.json > types.ts      # Save to file
 *   json2ts data.json --name MyType   # Custom interface name
 *   cat data.json | json2ts           # Pipe input
 *   json2ts --help                    # Show help
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

// Help
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${require('chalk').bold.cyan('json2ts')} — Convert JSON to TypeScript type definitions

Usage:
  json2ts data.json              Output to stdout
  json2ts data.json --name User  Custom type name
  json2ts data.json > types.ts   Save to file
  cat data.json | json2ts        Pipe input

Options:
  --name, -n <name>  Root type name (default: RootType)
  --help, -h         Show this help
`);
    process.exit(0);
}

function main() {
    const chalk = require('chalk');
    let jsonStr, rootName = 'RootType';

    // Parse args
    const nameIdx = args.findIndex(a => a === '--name' || a === '-n');
    if (nameIdx >= 0 && nameIdx + 1 < args.length) {
        rootName = args[nameIdx + 1];
    }

    const fileArg = args.find(a => !a.startsWith('--') && !a.startsWith('-'));

    if (fileArg) {
        jsonStr = fs.readFileSync(fileArg, 'utf-8');
    } else {
        // Read from stdin
        jsonStr = fs.readFileSync(0, 'utf-8');
    }

    let data;
    try {
        data = JSON.parse(jsonStr);
    } catch (e) {
        console.error(chalk.red('✖ Invalid JSON:'), e.message);
        process.exit(1);
    }

    const types = generateTypes(data, rootName);
    console.log(types);
}

function generateTypes(data, name) {
    const output = [];
    const interfaces = {};
    const seen = new Set();

    function getType(value, depth) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';

        const type = Array.isArray(value) ? 'array' : typeof value;

        switch (type) {
            case 'string': return 'string';
            case 'number': return 'number';
            case 'boolean': return 'boolean';
            case 'array': {
                if (value.length === 0) return 'any[]';
                const types = [...new Set(value.map(v => getType(v, depth)))].filter(t => t !== 'undefined');
                if (types.length === 1) return types[0] + '[]';
                return `(${types.join(' | ')})[]`;
            }
            case 'object': {
                // Check if it's already been defined
                const key = JSON.stringify(Object.keys(value).sort());
                let interfaceName = `${name}_${depth}_${Object.keys(value).length}`;
                
                // Try to find a good name
                if (seen.has(key)) {
                    // Find the existing interface name
                    for (const k of Object.keys(interfaces)) {
                        if (interfaces[k].key === key) return k;
                    }
                }
                
                seen.add(key);
                interfaceName = `${name}_${depth}`;
                
                // Actually, let's name it based on parent + field name
                // This gets overridden in the parent anyway
                interfaceName = `${name}_Inner${depth}`;
                
                const props = [];
                for (const [k, v] of Object.entries(value)) {
                    const propType = getType(v, depth + 1);
                    props.push(`    ${k}: ${propType};`);
                }
                
                const result = `{\n${props.join('\n')}\n${'  '.repeat(Math.max(0, depth - 1))}}`;
                interfaces[interfaceName] = result;
                return interfaceName;
            }
            default: return 'any';
        }
    }

    // Handle arrays at root
    if (Array.isArray(data)) {
        if (data.length === 0) {
            output.push(`export type ${name} = any[];`);
        } else {
            const types = [...new Set(data.map(v => getType(v, 1)))].filter(t => t !== 'undefined');
            output.push(`export type ${name} = ${types.join(' | ')}[];`);
        }
    } else if (typeof data === 'object' && data !== null) {
        const props = [];
        for (const [k, v] of Object.entries(data)) {
            const propType = getType(v, 1);
            props.push(`  ${k}: ${propType};`);
        }
        
        // Check for nested interfaces
        if (Object.keys(interfaces).length > 0) {
            for (const [name, content] of Object.entries(interfaces)) {
                if (typeof content === 'string') {
                    output.push(`interface ${name} ${content}`);
                }
            }
        }
        
        output.push(`export interface ${name} {`);
        output.push(props.join('\n'));
        output.push('}');
    } else {
        output.push(`export type ${name} = ${getType(data, 0)};`);
    }

    return output.join('\n');
}

main();
