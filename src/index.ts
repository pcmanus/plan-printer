#!/usr/bin/env node

import yargs = require('yargs/yargs');

const args = yargs(process.argv.slice(2))
  .usage('$0 [dir]', 'Computes a query plan with the schema and query in [dir]')
  .options({
    'quiet': {
      type: 'boolean',
      alias: 'q',
      default: false,
      describe: 'Do not display the built query plan (and ignore -v if used). Useful in conjunction with -d.'
    },
    'debug': {
      type: 'boolean',
      alias: 'd',
      default: false,
      describe: 'Enables debug logging in the query planner (equivalent to declaring the QP_DEBUG env variable)'
    },
    'verbose': {
      type: 'count',
      alias: 'v',
      default: 0,
      describe: 'Display the supergraph schema and query before outputing the query plan. '
                + 'Double the flag (-vv) to also display the subgraphs.'
    }
  })
const argv = args.argv;

// This has to happen before the import the query planner as the QP_DEBUG variable is checked "statically". That's
// why we put the rest of our import/code below (slightly ugly but hey!).
if (argv.debug) {
  process.env.APOLLO_QP_DEBUG = "true";
}

import { buildComposedSchema, buildOperationContext, QueryPlanner, prettyFormatQueryPlan } from '@apollo/query-planner';
import { composeAndValidate, ServiceDefinition } from '@apollo/federation';
import { parse, printSchema, buildASTSchema } from 'graphql';
import fs = require('fs');

if (!argv.dir) {
  console.error("Missing mandatory directory argument.");
  args.showHelp();
  process.exit(1);
}

let dir = argv.dir as string;
if (!fs.existsSync(dir)) {
  console.error(`Directory ${dir} does not exists.`);
  process.exit(1);
}

let queryFileName = "query.graphql";
let queryFile = `${argv.dir}/${queryFileName}`;
if (!fs.existsSync(queryFile)) {
  console.error(`Cannot find query file: ${queryFile} does not exists.`);
  process.exit(1);
}

function log(message?: string) {
  if (!argv.quiet) {
    if (message) {
      console.log(message);
    } else {
      console.log();
    }
  }
}

function hbar(length: number): string {
  let str = "";
  for (let i = 0; i < length; i++) {
    str += "-";
  }
  return str;
}

function logTitle(title: string) {
  const titleStr = `${title}:`;
  log(titleStr);
  log(hbar(titleStr.length));
  log();
}

function logWithTitle(title: string, content: string) {
  logTitle(title);
  log(content);
  log();
}

const subgraphsFiles = fs.readdirSync(dir).filter(file => file.endsWith(".graphql") && file != queryFileName);
const subgraphs : ServiceDefinition[] = subgraphsFiles.map(fileName => {
  let name = fileName.substr(0, fileName.length - ".graphql".length);
  let fileContent = fs.readFileSync(`${dir}/${fileName}`, 'utf8');
  let fileSchema = parse(fileContent);
  return {
    typeDefs: fileSchema,
    name: name,
    url: name + ".com"
  };
});

// Printing the subgraphs before we try composition so it's easier to debug composition errors.
if (argv.verbose > 1) {
  for (const subgraph of subgraphs) {
    logWithTitle(`Subgraph ${subgraph.name}`, printSchema(buildASTSchema(subgraph.typeDefs)));
  }
}

let composedSchema = composeAndValidate(subgraphs);
let supergraphSdl = composedSchema.supergraphSdl;
if (supergraphSdl == undefined) {
  console.error("Errors during composition : %j", composedSchema.errors);
  process.exit(1);
}

if (argv.verbose > 0) {
  logWithTitle("Supergraph", supergraphSdl);
}

const query = fs.readFileSync(queryFile, 'utf8');
if (argv.verbose > 0) {
  logWithTitle("Query", query);
}

const schema = buildComposedSchema(parse(supergraphSdl));
const operationContext = buildOperationContext(schema, parse(query));
let planner = new QueryPlanner(schema);

if (argv.debug && !argv.quiet && argv.verbose > 0) {
  // If we have debug, we're about to display the query planner debug logging. If we use verbose output, let's add
  // a nice title for consistency with the rest of it.
  logTitle("Query planner debug logging");
}

let plan = planner.buildQueryPlan(operationContext, { autoFragmentization: false })

if (argv.debug && !argv.quiet) {
  // If debug was enabled, we expect the debug logging to have been printed by now, but since we're going to print
  // the query plan now, let's add a few empty lines for readability.
  log('\n');
}

let planStr = prettyFormatQueryPlan(plan);
if (argv.verbose > 0) {
  logWithTitle("Computed Plan", planStr);
} else {
  log(planStr);
}
