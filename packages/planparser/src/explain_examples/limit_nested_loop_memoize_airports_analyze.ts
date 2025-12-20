/**
 * Limit  (cost=0.59..13.82 rows=100 width=133) (actual time=0.077..0.488 rows=100.00 loops=1)
 *  Buffers: shared hit=14
 *  ->  Nested Loop  (cost=0.59..2217.86 rows=16761 width=133) (actual time=0.075..0.463 rows=100.00 loops=1)
 *       Buffers: shared hit=14
 *       ->  Nested Loop  (cost=0.44..1784.30 rows=16761 width=76) (actual time=0.064..0.312 rows=100.00 loops=1)
 *             Buffers: shared hit=10
 *             ->  Index Scan Backward using flights_pkey on flights f  (cost=0.29..1350.74 rows=16761 width=19) (actual time=0.041..0.169 rows=100.00 loops=1)
 *                   Filter: ((status)::text = 'Arrived'::text)
 *                   Rows Removed by Filter: 104
 *                   Index Searches: 1
 *                   Buffers: shared hit=6
 *             ->  Memoize  (cost=0.15..0.17 rows=1 width=65) (actual time=0.001..0.001 rows=1.00 loops=100)
 *                   Cache Key: f.departure_airport
 *                   Cache Mode: logical
 *                   Hits: 98  Misses: 2  Evictions: 0  Overflows: 0  Memory Usage: 1kB
 *                   Buffers: shared hit=4
 *                   ->  Index Scan using airports_data_pkey on airports_data a1  (cost=0.14..0.16 rows=1 width=65) (actual time=0.008..0.008 rows=1.00 loops=2)
 *                         Index Cond: (airport_code = f.departure_airport)
 *                         Index Searches: 2
 *                         Buffers: shared hit=4
 *         ->  Memoize  (cost=0.15..0.17 rows=1 width=65) (actual time=0.001..0.001 rows=1.00 loops=100)
 *               Cache Key: f.arrival_airport
 *               Cache Mode: logical
 *               Hits: 98  Misses: 2  Evictions: 0  Overflows: 0  Memory Usage: 1kB
 *               Buffers: shared hit=4
 *               ->  Index Scan using airports_data_pkey on airports_data a2  (cost=0.14..0.16 rows=1 width=65) (actual time=0.018..0.018 rows=1.00 loops=2)
 *                     Index Cond: (airport_code = f.arrival_airport)
 *                     Index Searches: 2
 *                     Buffers: shared hit=4
 * Planning:
 *   Buffers: shared hit=8
 * Planning Time: 1.625 ms
 * Execution Time: 0.620 ms
 */
export default `
[
  {
    "Plan": {
      "Node Type": "Limit",
      "Parallel Aware": false,
      "Async Capable": false,
      "Startup Cost": 0.59,
      "Total Cost": 13.82,
      "Plan Rows": 100,
      "Plan Width": 133,
      "Actual Startup Time": 0.040,
      "Actual Total Time": 0.238,
      "Actual Rows": 100.00,
      "Actual Loops": 1,
      "Disabled": false,
      "Shared Hit Blocks": 14,
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
          "Node Type": "Nested Loop",
          "Parent Relationship": "Outer",
          "Parallel Aware": false,
          "Async Capable": false,
          "Join Type": "Inner",
          "Startup Cost": 0.59,
          "Total Cost": 2217.86,
          "Plan Rows": 16761,
          "Plan Width": 133,
          "Actual Startup Time": 0.039,
          "Actual Total Time": 0.225,
          "Actual Rows": 100.00,
          "Actual Loops": 1,
          "Disabled": false,
          "Inner Unique": true,
          "Shared Hit Blocks": 14,
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
              "Node Type": "Nested Loop",
              "Parent Relationship": "Outer",
              "Parallel Aware": false,
              "Async Capable": false,
              "Join Type": "Inner",
              "Startup Cost": 0.44,
              "Total Cost": 1784.30,
              "Plan Rows": 16761,
              "Plan Width": 76,
              "Actual Startup Time": 0.033,
              "Actual Total Time": 0.166,
              "Actual Rows": 100.00,
              "Actual Loops": 1,
              "Disabled": false,
              "Inner Unique": true,
              "Shared Hit Blocks": 10,
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
                  "Plan Width": 19,
                  "Actual Startup Time": 0.018,
                  "Actual Total Time": 0.093,
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
                },
                {
                  "Node Type": "Memoize",
                  "Parent Relationship": "Inner",
                  "Parallel Aware": false,
                  "Async Capable": false,
                  "Startup Cost": 0.15,
                  "Total Cost": 0.17,
                  "Plan Rows": 1,
                  "Plan Width": 65,
                  "Actual Startup Time": 0.000,
                  "Actual Total Time": 0.000,
                  "Actual Rows": 1.00,
                  "Actual Loops": 100,
                  "Disabled": false,
                  "Cache Key": "f.departure_airport",
                  "Cache Mode": "logical",
                  "Cache Hits": 98,
                  "Cache Misses": 2,
                  "Cache Evictions": 0,
                  "Cache Overflows": 0,
                  "Peak Memory Usage": 1,
                  "Shared Hit Blocks": 4,
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
                      "Scan Direction": "Forward",
                      "Index Name": "airports_data_pkey",
                      "Relation Name": "airports_data",
                      "Alias": "a1",
                      "Startup Cost": 0.14,
                      "Total Cost": 0.16,
                      "Plan Rows": 1,
                      "Plan Width": 65,
                      "Actual Startup Time": 0.004,
                      "Actual Total Time": 0.004,
                      "Actual Rows": 1.00,
                      "Actual Loops": 2,
                      "Disabled": false,
                      "Index Cond": "(airport_code = f.departure_airport)",
                      "Rows Removed by Index Recheck": 0,
                      "Index Searches": 2,
                      "Shared Hit Blocks": 4,
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
                }
              ]
            },
            {
              "Node Type": "Memoize",
              "Parent Relationship": "Inner",
              "Parallel Aware": false,
              "Async Capable": false,
              "Startup Cost": 0.15,
              "Total Cost": 0.17,
              "Plan Rows": 1,
              "Plan Width": 65,
              "Actual Startup Time": 0.000,
              "Actual Total Time": 0.000,
              "Actual Rows": 1.00,
              "Actual Loops": 100,
              "Disabled": false,
              "Cache Key": "f.arrival_airport",
              "Cache Mode": "logical",
              "Cache Hits": 98,
              "Cache Misses": 2,
              "Cache Evictions": 0,
              "Cache Overflows": 0,
              "Peak Memory Usage": 1,
              "Shared Hit Blocks": 4,
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
                  "Scan Direction": "Forward",
                  "Index Name": "airports_data_pkey",
                  "Relation Name": "airports_data",
                  "Alias": "a2",
                  "Startup Cost": 0.14,
                  "Total Cost": 0.16,
                  "Plan Rows": 1,
                  "Plan Width": 65,
                  "Actual Startup Time": 0.003,
                  "Actual Total Time": 0.003,
                  "Actual Rows": 1.00,
                  "Actual Loops": 2,
                  "Disabled": false,
                  "Index Cond": "(airport_code = f.arrival_airport)",
                  "Rows Removed by Index Recheck": 0,
                  "Index Searches": 2,
                  "Shared Hit Blocks": 4,
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
            }
          ]
        }
      ]
    },
    "Planning": {
      "Shared Hit Blocks": 8,
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
    "Planning Time": 0.623,
    "Triggers": [
    ],
    "Execution Time": 0.289
  }
]
`;


