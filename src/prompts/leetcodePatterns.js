/**
 * LeetCode Pattern Templates
 * Defines problem patterns and characteristics for each difficulty level
 * Organized by skill and difficulty to guide AI question generation
 */

const SKILL_PATTERNS = {
  JavaScript: {
    level1: {
      patterns: ['Array Manipulation', 'String Operations', 'Basic Loops', 'Conditional Logic'],
      problemTypes: [
        'Find max/min in array',
        'String reversal and palindromes',
        'Simple array filtering',
        'Count occurrences',
        'Basic object/map operations'
      ],
      leetcodeReferences: ['LC #1 Two Sum', 'LC #217 Contains Duplicate', 'LC #242 Valid Anagram', 'LC #13 Roman to Integer'],
      constraints: {
        timeComplexity: 'O(n) or O(n^2) acceptable',
        spaceComplexity: 'O(n) acceptable',
        inputSize: 'Small (n < 1000)'
      },
      requiredConcepts: ['for/while loops', 'if/else', 'basic array methods', 'objects/maps']
    },
    level2: {
      patterns: ['Hash Tables', 'Two Pointers', 'Sorting', 'Set Operations'],
      problemTypes: [
        'Array intersection/union',
        'Two sum variations',
        'String matching with hash maps',
        'Remove duplicates',
        'Frequency counting'
      ],
      leetcodeReferences: ['LC #349 Intersection Arrays', 'LC #350 Intersection II', 'LC #26 Remove Duplicates', 'LC #283 Move Zeroes'],
      constraints: {
        timeComplexity: 'O(n) or O(n log n)',
        spaceComplexity: 'O(n)',
        inputSize: 'Medium (n < 10000)'
      },
      requiredConcepts: ['Map/Set', 'sorting algorithms', 'two-pointer technique', 'in-place modifications']
    },
    level3: {
      patterns: ['Dynamic Programming', 'Sliding Window', 'Stack/Queue', 'Recursion', 'Binary Search'],
      problemTypes: [
        'Longest/shortest substring problems',
        'Stock buy/sell variations',
        'Valid parentheses',
        'Binary search on sorted arrays',
        'Simple DP (fibonacci, climbing stairs)'
      ],
      leetcodeReferences: ['LC #3 Longest Substring', 'LC #121 Best Time Stock', 'LC #20 Valid Parentheses', 'LC #70 Climbing Stairs'],
      constraints: {
        timeComplexity: 'O(n) or O(n log n) required',
        spaceComplexity: 'O(n) or better',
        inputSize: 'Large (n < 100000)'
      },
      requiredConcepts: ['sliding window', 'stack operations', 'memoization', 'binary search', 'recursion']
    },
    level4: {
      patterns: ['Advanced DP', 'Backtracking', 'Graph Traversal', 'Trie', 'Heap'],
      problemTypes: [
        '2D DP problems',
        'Combination/permutation generation',
        'Graph shortest path',
        'Trie-based search',
        'Top K elements with heap'
      ],
      leetcodeReferences: ['LC #322 Coin Change', 'LC #39 Combination Sum', 'LC #200 Number Islands', 'LC #347 Top K Frequent'],
      constraints: {
        timeComplexity: 'O(n log n) or better required',
        spaceComplexity: 'Optimize space when possible',
        inputSize: 'Very large (n < 1000000)'
      },
      requiredConcepts: ['2D DP', 'backtracking', 'BFS/DFS', 'priority queue', 'trie structures']
    },
    level5: {
      patterns: ['Complex DP', 'Advanced Graphs', 'Bit Manipulation', 'Mathematical Insights', 'Optimization'],
      problemTypes: [
        'Multi-dimensional DP',
        'Shortest path with constraints',
        'Bit manipulation puzzles',
        'Game theory',
        'Advanced data structure design'
      ],
      leetcodeReferences: ['LC #72 Edit Distance', 'LC #42 Trapping Rain Water', 'LC #146 LRU Cache', 'LC #239 Sliding Window Max'],
      constraints: {
        timeComplexity: 'Optimal solution required (often O(n) or O(n log n))',
        spaceComplexity: 'Space-time tradeoffs',
        inputSize: 'Massive (n < 10000000)'
      },
      requiredConcepts: ['state compression', 'union-find', 'segment trees', 'advanced bit manipulation', 'mathematical proofs']
    }
  },

  Python: {
    level1: {
      patterns: ['List Comprehensions', 'Basic String Methods', 'Dictionary Basics', 'Simple Functions'],
      problemTypes: [
        'List filtering and mapping',
        'String manipulation',
        'Dictionary counting',
        'Simple iteration',
        'Basic math operations'
      ],
      leetcodeReferences: ['LC #1480 Running Sum', 'LC #1431 Kids With Candies', 'LC #771 Jewels and Stones'],
      constraints: {
        timeComplexity: 'O(n) or O(n^2) acceptable',
        spaceComplexity: 'O(n) acceptable',
        inputSize: 'Small (n < 1000)'
      },
      requiredConcepts: ['for loops', 'list comprehensions', 'dict methods', 'built-in functions']
    },
    level2: {
      patterns: ['Set Operations', 'Defaultdict/Counter', 'Sorting with Key', 'List Slicing'],
      problemTypes: [
        'Frequency analysis',
        'Set intersection/difference',
        'Custom sorting',
        'Array partitioning',
        'String anagrams'
      ],
      leetcodeReferences: ['LC #242 Valid Anagram', 'LC #49 Group Anagrams', 'LC #347 Top K Frequent'],
      constraints: {
        timeComplexity: 'O(n log n) acceptable',
        spaceComplexity: 'O(n)',
        inputSize: 'Medium (n < 10000)'
      },
      requiredConcepts: ['collections module', 'set operations', 'lambda functions', 'slicing', 'itertools']
    },
    level3: {
      patterns: ['Dynamic Programming', 'Two Pointers', 'BFS/DFS', 'Binary Search', 'Stack/Queue'],
      problemTypes: [
        'DP with memoization',
        'Graph traversal',
        'Binary search variants',
        'Monotonic stack',
        'Sliding window'
      ],
      leetcodeReferences: ['LC #200 Number Islands', 'LC #15 3Sum', 'LC #33 Search Rotated', 'LC #394 Decode String'],
      constraints: {
        timeComplexity: 'O(n) or O(n log n)',
        spaceComplexity: 'O(n)',
        inputSize: 'Large (n < 100000)'
      },
      requiredConcepts: ['recursion with memo', 'deque', 'bisect module', 'graph representations', 'generators']
    },
    level4: {
      patterns: ['Advanced DP', 'Trie', 'Union Find', 'Backtracking', 'Heap Operations'],
      problemTypes: [
        '2D DP optimization',
        'Prefix tree problems',
        'Disjoint set union',
        'N-Queens variants',
        'Priority queue problems'
      ],
      leetcodeReferences: ['LC #72 Edit Distance', 'LC #208 Implement Trie', 'LC #547 Number Provinces', 'LC #51 N-Queens'],
      constraints: {
        timeComplexity: 'Optimal required',
        spaceComplexity: 'Consider space-time tradeoffs',
        inputSize: 'Very large (n < 1000000)'
      },
      requiredConcepts: ['heapq module', 'class design', 'union-find', 'bit operations', 'state machines']
    },
    level5: {
      patterns: ['Segment Trees', 'Complex Graph Algorithms', 'Mathematical Proofs', 'Game Theory', 'Advanced Optimization'],
      problemTypes: [
        'Range query problems',
        'Dijkstra/Bellman-Ford',
        'Number theory',
        'Minimax algorithms',
        'Multi-dimensional optimization'
      ],
      leetcodeReferences: ['LC #4 Median Two Arrays', 'LC #42 Trap Rain Water', 'LC #363 Max Sum Rectangle', 'LC #295 Median Stream'],
      constraints: {
        timeComplexity: 'Best possible required',
        spaceComplexity: 'Optimal space usage',
        inputSize: 'Massive (n < 10000000)'
      },
      requiredConcepts: ['advanced data structures', 'mathematical insights', 'space optimization', 'cache-aware algorithms']
    }
  },

  Java: {
    level1: {
      patterns: ['ArrayList Basics', 'String Methods', 'HashMap Basics', 'Simple Iteration'],
      problemTypes: [
        'Array/List manipulation',
        'String operations',
        'Basic HashMap usage',
        'Simple loops and conditions',
        'Integer math'
      ],
      leetcodeReferences: ['LC #1 Two Sum', 'LC #9 Palindrome Number', 'LC #13 Roman to Integer'],
      constraints: {
        timeComplexity: 'O(n) or O(n^2)',
        spaceComplexity: 'O(n)',
        inputSize: 'Small (n < 1000)'
      },
      requiredConcepts: ['ArrayList', 'HashMap', 'String methods', 'for-each loops', 'Integer wrapper']
    },
    level2: {
      patterns: ['HashSet Operations', 'Collections Sorting', 'StringBuilder', 'Two Pointers'],
      problemTypes: [
        'Set operations',
        'Custom Comparator',
        'String building efficiency',
        'In-place array modifications',
        'LinkedList operations'
      ],
      leetcodeReferences: ['LC #349 Intersection', 'LC #26 Remove Duplicates', 'LC #125 Valid Palindrome'],
      constraints: {
        timeComplexity: 'O(n log n)',
        spaceComplexity: 'O(n)',
        inputSize: 'Medium (n < 10000)'
      },
      requiredConcepts: ['HashSet', 'Collections.sort', 'Comparator interface', 'StringBuilder', 'LinkedList']
    },
    level3: {
      patterns: ['Stack/Queue', 'TreeMap/TreeSet', 'BFS/DFS', 'Dynamic Programming', 'Binary Search'],
      problemTypes: [
        'Valid parentheses',
        'Tree traversal',
        'Graph problems',
        'DP with arrays',
        'Binary search variants'
      ],
      leetcodeReferences: ['LC #20 Valid Parentheses', 'LC #102 Level Order', 'LC #200 Islands', 'LC #70 Climb Stairs'],
      constraints: {
        timeComplexity: 'O(n) or O(n log n)',
        spaceComplexity: 'O(n)',
        inputSize: 'Large (n < 100000)'
      },
      requiredConcepts: ['Stack/Queue', 'TreeMap', 'recursion', '2D arrays', 'Collections API']
    },
    level4: {
      patterns: ['PriorityQueue', 'Trie Implementation', 'Advanced DP', 'Graph Algorithms', 'Backtracking'],
      problemTypes: [
        'Heap operations',
        'Prefix tree',
        '2D DP',
        'Union-Find',
        'Combination generation'
      ],
      leetcodeReferences: ['LC #347 Top K', 'LC #208 Trie', 'LC #322 Coin Change', 'LC #39 Combination Sum'],
      constraints: {
        timeComplexity: 'Optimal required',
        spaceComplexity: 'Space optimization needed',
        inputSize: 'Very large (n < 1000000)'
      },
      requiredConcepts: ['PriorityQueue', 'custom classes', 'generics', 'recursion optimization', 'bit operations']
    },
    level5: {
      patterns: ['Segment Tree', 'Advanced Graph', 'Concurrent Collections', 'Complex OOP Design', 'Mathematical Algorithms'],
      problemTypes: [
        'Range queries',
        'Shortest path advanced',
        'Thread-safe structures',
        'Design patterns',
        'Number theory'
      ],
      leetcodeReferences: ['LC #146 LRU Cache', 'LC #295 Median Stream', 'LC #42 Trap Water', 'LC #4 Median Arrays'],
      constraints: {
        timeComplexity: 'Best possible',
        spaceComplexity: 'Optimal',
        inputSize: 'Massive (n < 10000000)'
      },
      requiredConcepts: ['advanced data structures', 'concurrency', 'design patterns', 'space-time optimization', 'mathematical proofs']
    }
  },

  React: {
    level1: {
      patterns: ['Component Props', 'State Basics', 'Event Handling', 'Conditional Rendering'],
      problemTypes: [
        'Simple counter component',
        'List rendering',
        'Form input handling',
        'Toggle visibility',
        'Props passing'
      ],
      leetcodeReferences: ['Build todo list UI', 'Toggle button state', 'Form validation basics'],
      constraints: {
        complexity: 'Single component, basic hooks',
        features: '2-3 interactive features',
        testing: 'Manual testing acceptable'
      },
      requiredConcepts: ['useState', 'props', 'onClick/onChange', 'map for lists', 'conditional rendering']
    },
    level2: {
      patterns: ['useEffect', 'Multiple Components', 'Lifting State', 'Component Composition'],
      problemTypes: [
        'Data fetching',
        'Parent-child communication',
        'Controlled components',
        'Component reusability',
        'Side effect management'
      ],
      leetcodeReferences: ['API data display', 'Multi-step form', 'Filtering/sorting UI'],
      constraints: {
        complexity: '3-5 components, lifecycle management',
        features: 'API integration, state management',
        testing: 'Basic component tests'
      },
      requiredConcepts: ['useEffect', 'prop drilling', 'controlled inputs', 'fetch/async', 'component composition']
    },
    level3: {
      patterns: ['Context API', 'useReducer', 'Custom Hooks', 'Performance Optimization'],
      problemTypes: [
        'Global state management',
        'Complex state logic',
        'Reusable hooks',
        'Memoization',
        'Lazy loading'
      ],
      leetcodeReferences: ['Shopping cart', 'Theme switcher', 'Infinite scroll', 'Debounced search'],
      constraints: {
        complexity: 'Multi-page app, global state',
        features: 'Optimized rendering, custom hooks',
        testing: 'Unit tests required'
      },
      requiredConcepts: ['Context', 'useReducer', 'useMemo/useCallback', 'React.memo', 'custom hooks']
    },
    level4: {
      patterns: ['Advanced Patterns', 'State Libraries', 'Code Splitting', 'Advanced Hooks', 'TypeScript'],
      problemTypes: [
        'Render props/HOC',
        'Redux/Zustand integration',
        'Route-based splitting',
        'useTransition/Suspense',
        'Type-safe components'
      ],
      leetcodeReferences: ['Dashboard with Redux', 'Real-time updates', 'Complex forms', 'Authentication flow'],
      constraints: {
        complexity: 'Large-scale app architecture',
        features: 'State library, routing, auth',
        testing: 'Integration tests, coverage >80%'
      },
      requiredConcepts: ['Redux/Zustand', 'React Router', 'HOCs', 'TypeScript', 'testing library']
    },
    level5: {
      patterns: ['Micro-frontends', 'Server Components', 'Advanced Optimization', 'Design Systems', 'Architecture'],
      problemTypes: [
        'Module federation',
        'Next.js SSR/SSG',
        'Virtual scrolling',
        'Component library',
        'Monorepo setup'
      ],
      leetcodeReferences: ['Multi-app architecture', 'Design system', 'Performance optimization', 'Accessibility'],
      constraints: {
        complexity: 'Enterprise-level architecture',
        features: 'Advanced patterns, scalability',
        testing: 'E2E, visual regression, performance'
      },
      requiredConcepts: ['micro-frontends', 'SSR/SSG', 'Webpack/Vite', 'design systems', 'monorepo', 'a11y']
    }
  },

  'Node.js': {
    level1: {
      patterns: ['HTTP Basics', 'File System', 'Basic Express', 'Async Basics'],
      problemTypes: [
        'Simple HTTP server',
        'Read/write files',
        'Basic REST endpoint',
        'Promise basics',
        'JSON parsing'
      ],
      leetcodeReferences: ['Create API endpoint', 'File upload', 'JSON response', 'Error handling'],
      constraints: {
        complexity: 'Single file, basic routes',
        features: '2-3 endpoints, file operations',
        testing: 'Manual API testing'
      },
      requiredConcepts: ['http module', 'fs module', 'Express basics', 'async/await', 'middleware concept']
    },
    level2: {
      patterns: ['Express Middleware', 'MongoDB Basics', 'Authentication', 'Validation'],
      problemTypes: [
        'Custom middleware',
        'CRUD operations',
        'JWT authentication',
        'Input validation',
        'Error handling'
      ],
      leetcodeReferences: ['User auth system', 'REST CRUD', 'Validation middleware', 'DB queries'],
      constraints: {
        complexity: 'Multiple routes, database',
        features: 'Auth, validation, DB integration',
        testing: 'API tests with tools'
      },
      requiredConcepts: ['Express middleware', 'Mongoose', 'JWT', 'bcrypt', 'validator libraries']
    },
    level3: {
      patterns: ['Advanced DB Queries', 'WebSockets', 'Caching', 'File Processing', 'Aggregation'],
      problemTypes: [
        'Complex aggregation',
        'Real-time features',
        'Redis caching',
        'Stream processing',
        'Pagination'
      ],
      leetcodeReferences: ['Real-time chat', 'Data aggregation', 'File upload processing', 'Cache strategy'],
      constraints: {
        complexity: 'Multi-service architecture',
        features: 'Real-time, caching, optimization',
        testing: 'Integration tests'
      },
      requiredConcepts: ['aggregation pipeline', 'Socket.io', 'Redis', 'streams', 'pagination strategies']
    },
    level4: {
      patterns: ['Microservices', 'Message Queues', 'Advanced Security', 'Performance', 'Docker'],
      problemTypes: [
        'Service communication',
        'Queue processing',
        'Rate limiting',
        'Load optimization',
        'Container deployment'
      ],
      leetcodeReferences: ['Microservice arch', 'RabbitMQ integration', 'API gateway', 'Performance tuning'],
      constraints: {
        complexity: 'Distributed system',
        features: 'Queues, security, deployment',
        testing: 'E2E, load testing'
      },
      requiredConcepts: ['microservices', 'RabbitMQ/Kafka', 'rate limiting', 'clustering', 'Docker']
    },
    level5: {
      patterns: ['Distributed Systems', 'Event Sourcing', 'CQRS', 'Advanced Scaling', 'Observability'],
      problemTypes: [
        'Event-driven architecture',
        'Command/query separation',
        'Horizontal scaling',
        'Monitoring/logging',
        'Saga patterns'
      ],
      leetcodeReferences: ['Event sourcing system', 'Distributed transactions', 'High availability', 'Metrics'],
      constraints: {
        complexity: 'Enterprise distributed system',
        features: 'Event sourcing, observability, HA',
        testing: 'Chaos engineering, load testing'
      },
      requiredConcepts: ['event sourcing', 'CQRS', 'Kubernetes', 'Prometheus', 'distributed tracing', 'saga pattern']
    }
  },

  SQL: {
    level1: {
      patterns: ['SELECT Basics', 'WHERE Clauses', 'Simple JOINs', 'ORDER BY', 'Basic Aggregation'],
      problemTypes: [
        'Single table queries',
        'Filtering with WHERE',
        'INNER JOIN two tables',
        'COUNT/SUM/AVG',
        'Sorting results'
      ],
      leetcodeReferences: ['LC #175 Combine Tables', 'LC #183 Never Ordered', 'LC #595 Big Countries'],
      constraints: {
        complexity: '1-2 tables, simple conditions',
        features: 'Basic SELECT, WHERE, JOIN',
        optimization: 'Not critical'
      },
      requiredConcepts: ['SELECT', 'WHERE', 'JOIN', 'aggregate functions', 'ORDER BY', 'LIMIT']
    },
    level2: {
      patterns: ['GROUP BY', 'HAVING', 'Multiple JOINs', 'Subqueries', 'CASE statements'],
      problemTypes: [
        'Grouping and filtering',
        'Multi-table joins',
        'Nested queries',
        'Conditional logic',
        'Date functions'
      ],
      leetcodeReferences: ['LC #184 Dept Highest', 'LC #176 Second Highest', 'LC #177 Nth Highest'],
      constraints: {
        complexity: '2-4 tables, grouping',
        features: 'GROUP BY, subqueries, CASE',
        optimization: 'Indexes helpful'
      },
      requiredConcepts: ['GROUP BY', 'HAVING', 'subqueries', 'CASE WHEN', 'date functions', 'NULL handling']
    },
    level3: {
      patterns: ['Window Functions', 'CTEs', 'Complex JOINs', 'Set Operations', 'Advanced Aggregation'],
      problemTypes: [
        'Running totals',
        'Ranking queries',
        'Recursive CTEs',
        'UNION/INTERSECT',
        'Pivot tables'
      ],
      leetcodeReferences: ['LC #178 Rank Scores', 'LC #180 Consecutive Numbers', 'LC #185 Top 3 Salaries'],
      constraints: {
        complexity: '4+ tables, window functions',
        features: 'ROW_NUMBER, RANK, CTEs',
        optimization: 'Query performance important'
      },
      requiredConcepts: ['window functions', 'CTEs', 'RANK/DENSE_RANK', 'PARTITION BY', 'recursive queries']
    },
    level4: {
      patterns: ['Complex CTEs', 'Advanced Window', 'Query Optimization', 'Index Strategy', 'Execution Plans'],
      problemTypes: [
        'Multi-level CTEs',
        'LAG/LEAD functions',
        'Index optimization',
        'Query tuning',
        'Performance analysis'
      ],
      leetcodeReferences: ['LC #579 Cumulative Salary', 'LC #601 Stadium', 'LC #618 Students Report'],
      constraints: {
        complexity: 'Complex multi-step logic',
        features: 'Advanced window, optimization',
        optimization: 'Must be optimized'
      },
      requiredConcepts: ['LAG/LEAD', 'FIRST_VALUE/LAST_VALUE', 'index design', 'execution plans', 'query hints']
    },
    level5: {
      patterns: ['Query Optimization', 'Database Design', 'Advanced Indexing', 'Partitioning', 'Sharding'],
      problemTypes: [
        'Complex optimization',
        'Schema design',
        'Composite indexes',
        'Table partitioning',
        'Distributed queries'
      ],
      leetcodeReferences: ['Performance optimization', 'Schema normalization', 'Index strategy', 'Partition design'],
      constraints: {
        complexity: 'Production-level optimization',
        features: 'Full optimization stack',
        optimization: 'Mission critical'
      },
      requiredConcepts: ['advanced indexing', 'partitioning', 'normalization', 'denormalization', 'sharding', 'query cache']
    }
  }
};

/**
 * Gets pattern information for a specific skill and difficulty level
 *
 * @param {string} skill - Programming skill (JavaScript, Python, etc.)
 * @param {string} difficulty - Difficulty level (level1-level5)
 * @returns {object|null} Pattern information or null if not found
 */
function getPatternForSkill(skill, difficulty) {
  const skillPatterns = SKILL_PATTERNS[skill];
  if (!skillPatterns) return null;

  return skillPatterns[difficulty] || null;
}

/**
 * Gets all supported skills for pattern generation
 *
 * @returns {array} Array of skill names
 */
function getSupportedSkills() {
  return Object.keys(SKILL_PATTERNS);
}

/**
 * Checks if a skill has pattern templates
 *
 * @param {string} skill - Programming skill
 * @returns {boolean} True if skill is supported
 */
function isSkillSupported(skill) {
  return SKILL_PATTERNS.hasOwnProperty(skill);
}

module.exports = {
  SKILL_PATTERNS,
  getPatternForSkill,
  getSupportedSkills,
  isSkillSupported
};
