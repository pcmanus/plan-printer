Apollo Federation Query Plan Printer
-----------------------------------

Simple binary to compute query plans for [Apollo Federation](https://github.com/apollographql/federation) from the command line.

This is mostly intended for helping working on the query planner code itself. This is not a polished tool in any way.

# Usage

Once you've cloned this repository locally, you can test it with:
```sh
> npm run build
> npx plan-query examples/minimal
```
which should output something along the lines of:
```
QueryPlan {
  Fetch(service: "subgraph1") {
    {
      v
    }
  },
}
```

Currently, the tool requires a directory as parameter (`examples/minimal` above). This directory should contain a
number of GraphQL files (which must have the `.graphql` extension) which are used in the following way:
- One of the files *must* be named exactly `query.graphql`, and will be used as the "query" (technically, it should
  contain either a GraphQL query or a GraphQL mutation, and only one).
- All other GraphQL files are interpreted as subgraphs schema. The name of the subgraph will be the file name (minus the
  `.graphql` extension) and the schema of that subgraph will be the file content.

From such a directory, `plan-query` will compose all the subgraph files and compute the plan for the provided query
against the resulting supergraph. You can use the `-v`/`--verbose` option to display the details of the subgraphs and
query (and `-vv` to also get the individual subgraphs schema).
