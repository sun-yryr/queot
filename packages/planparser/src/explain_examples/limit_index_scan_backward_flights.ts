/**
 * Limit  (cost=0.29..8.35 rows=100 width=11) (actual time=0.040..0.126 rows=100.00 loops=1)
 *  Buffers: shared hit=6
 *  ->  Index Scan Backward using flights_pkey on flights f  (cost=0.29..1350.74 rows=16761 width=11) (actual time=0.039..0.112 rows=100.00 loops=1)
 *       Filter: ((status)::text = 'Arrived'::text)
 *       Rows Removed by Filter: 104
 *       Index Searches: 1
 *       Buffers: shared hit=6
 * Planning Time: 0.459 ms
 * Execution Time: 0.192 ms
 */
export default `
[
  {
    "Plan": {
      "Node Type": "Limit",
      "Parallel Aware": false,
      "Async Capable": false,
      "Startup Cost": 0.29,
      "Total Cost": 8.35,
      "Plan Rows": 100,
      "Plan Width": 11,
      "Actual Startup Time": 0.049,
      "Actual Total Time": 0.130,
      "Actual Rows": 100.00,
      "Actual Loops": 1,
      "Disabled": false,
      "Shared Hit Blocks": 6,
      "Shared Read Blocks": 0,
      "Shared Dirtied Blocks": 0,
      "Shared Written Blocks": 0,
      "Local Hit Blocks": 0,
      "Local Read Blocks": 0,
      "Local Dirtied Blocks": 0,
      "Local Written Blocks": 0,
      "Temp Read Blocks": 0,
      "Temp Written Blocks": 0,
      "Plans": [
        {
          "Node Type": "Index Scan",
          "Parent Relationship": "Outer",
          "Parallel Aware": false,
          "Async Capable": false,
          "Scan Direction": "Backward",
          "Index Name": "flights_pkey",
          "Relation Name": "flights",
          "Alias": "f",
          "Startup Cost": 0.29,
          "Total Cost": 1350.74,
          "Plan Rows": 16761,
          "Plan Width": 11,
          "Actual Startup Time": 0.048,
          "Actual Total Time": 0.118,
          "Actual Rows": 100.00,
          "Actual Loops": 1,
          "Disabled": false,
          "Filter": "((status)::text = 'Arrived'::text)",
          "Rows Removed by Filter": 104,
          "Index Searches": 1,
          "Shared Hit Blocks": 6,
          "Shared Read Blocks": 0,
          "Shared Dirtied Blocks": 0,
          "Shared Written Blocks": 0,
          "Local Hit Blocks": 0,
          "Local Read Blocks": 0,
          "Local Dirtied Blocks": 0,
          "Local Written Blocks": 0,
          "Temp Read Blocks": 0,
          "Temp Written Blocks": 0
        }
      ]
    },
    "Planning": {
      "Shared Hit Blocks": 0,
      "Shared Read Blocks": 0,
      "Shared Dirtied Blocks": 0,
      "Shared Written Blocks": 0,
      "Local Hit Blocks": 0,
      "Local Read Blocks": 0,
      "Local Dirtied Blocks": 0,
      "Local Written Blocks": 0,
      "Temp Read Blocks": 0,
      "Temp Written Blocks": 0
    },
    "Planning Time": 0.473,
    "Triggers": [
    ],
    "Execution Time": 0.227
  }
]
`;


