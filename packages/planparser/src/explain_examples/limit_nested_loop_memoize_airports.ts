/**
 * Limit  (cost=0.59..13.82 rows=100 width=133)
 *  ->  Nested Loop  (cost=0.59..2217.86 rows=16761 width=133)
 *       ->  Nested Loop  (cost=0.44..1784.30 rows=16761 width=76)
 *             ->  Index Scan Backward using flights_pkey on flights f  (cost=0.29..1350.74 rows=16761 width=19)
 *                  Filter: ((status)::text = 'Arrived'::text)
 *             ->  Memoize  (cost=0.15..0.17 rows=1 width=65)
 *                  Cache Key: f.departure_airport
 *                  Cache Mode: logical
 *                 ->  Index Scan using airports_data_pkey on airports_data a1  (cost=0.14..0.16 rows=1 width=65)
 *                       Index Cond: (airport_code = f.departure_airport)
 *       ->  Memoize  (cost=0.15..0.17 rows=1 width=65)
 *             Cache Key: f.arrival_airport
 *             Cache Mode: logical
 *             ->  Index Scan using airports_data_pkey on airports_data a2  (cost=0.14..0.16 rows=1 width=65)
 *                   Index Cond: (airport_code = f.arrival_airport)
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
      "Disabled": false,
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
          "Disabled": false,
          "Inner Unique": true,
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
              "Disabled": false,
              "Inner Unique": true,
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
                  "Disabled": false,
                  "Filter": "((status)::text = 'Arrived'::text)"
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
                  "Disabled": false,
                  "Cache Key": "f.departure_airport",
                  "Cache Mode": "logical",
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
                      "Disabled": false,
                      "Index Cond": "(airport_code = f.departure_airport)"
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
              "Disabled": false,
              "Cache Key": "f.arrival_airport",
              "Cache Mode": "logical",
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
                  "Disabled": false,
                  "Index Cond": "(airport_code = f.arrival_airport)"
                }
              ]
            }
          ]
        }
      ]
    }
  }
]
`;


