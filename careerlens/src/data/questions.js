// Practice question bank (generated per role skill, NOT scraped from any interview site).
// Each question has keywords used by the mock evaluator. In production an AI scorer grades against a rubric.
const q = (id, text, keywords, level = 'Medium', tip = '') => ({ id, text, keywords, level, tip })

export const QUESTIONS = {
  android: [
    q('a1', 'Explain the Android Activity lifecycle and what happens on a configuration change like rotation.', ['oncreate', 'onstart', 'onresume', 'onpause', 'viewmodel', 'savedinstancestate', 'recreate', 'configuration'], 'Easy', 'Mention ViewModel survives rotation.'),
    q('a2', 'What is recomposition in Jetpack Compose and how do you avoid unnecessary recompositions?', ['recomposition', 'state', 'remember', 'stable', 'key', 'lazycolumn', 'derivedstateof', 'immutable'], 'Medium', 'Talk about state hoisting and stability.'),
    q('a3', 'Coroutines vs threads: why are coroutines preferred on Android?', ['lightweight', 'suspend', 'dispatcher', 'structured', 'scope', 'cancellation', 'main', 'flow'], 'Medium'),
    q('a4', 'How would you build offline-first caching with Room and a REST API?', ['room', 'dao', 'cache', 'repository', 'single source of truth', 'sync', 'flow', 'retrofit'], 'Hard', 'Single source of truth is the key phrase.'),
    q('a5', 'Explain MVVM in Android and why it helps testing.', ['viewmodel', 'livedata', 'stateflow', 'repository', 'separation', 'testable', 'view', 'model'], 'Easy'),
    q('a6', 'Design the architecture of a chat app for 1 million users on mobile.', ['websocket', 'pagination', 'offline', 'push', 'fcm', 'cache', 'retry', 'encryption', 'queue'], 'Hard', 'Cover delivery, offline and sync.'),
  ],
  fullstack: [
    q('f1', 'What happens when you type a URL in the browser and press Enter?', ['dns', 'tcp', 'tls', 'http', 'render', 'dom', 'server', 'cache'], 'Easy'),
    q('f2', 'Explain the React rendering process and how keys affect list updates.', ['virtual dom', 'reconciliation', 'key', 'state', 'props', 'render', 'diff', 'memo'], 'Medium'),
    q('f3', 'How would you secure a REST API built with Node.js?', ['authentication', 'jwt', 'validation', 'rate limit', 'cors', 'https', 'sanitize', 'helmet', 'injection'], 'Medium'),
    q('f4', 'SQL vs NoSQL: how do you choose for a new product?', ['schema', 'transactions', 'scaling', 'joins', 'consistency', 'document', 'index', 'access pattern'], 'Medium'),
    q('f5', 'Explain closures and the event loop in JavaScript.', ['closure', 'scope', 'event loop', 'callback', 'promise', 'microtask', 'async', 'call stack'], 'Medium'),
    q('f6', 'Design a URL shortener.', ['hash', 'database', 'collision', 'cache', 'redirect', 'scale', 'base62', 'analytics'], 'Hard'),
  ],
  backend: [
    q('b1', 'Explain how Spring Boot autoconfiguration works.', ['annotation', 'classpath', 'conditional', 'bean', 'starter', 'autoconfiguration', 'properties'], 'Medium'),
    q('b2', 'How do database indexes work and when can they hurt performance?', ['b-tree', 'index', 'write', 'query', 'selectivity', 'cardinality', 'composite', 'scan'], 'Medium'),
    q('b3', 'Design a rate limiter for an API.', ['token bucket', 'sliding window', 'redis', 'distributed', 'key', 'limit', 'burst', 'header'], 'Hard'),
    q('b4', 'What is idempotency and why does it matter for payments APIs?', ['idempotent', 'retry', 'key', 'duplicate', 'post', 'put', 'safe', 'transaction'], 'Medium'),
    q('b5', 'Kafka vs a traditional queue: when would you use each?', ['partition', 'offset', 'consumer group', 'replay', 'throughput', 'ordering', 'retention', 'broker'], 'Hard'),
    q('b6', 'How do you make a service horizontally scalable?', ['stateless', 'load balancer', 'cache', 'database', 'session', 'queue', 'replica', 'sharding'], 'Medium'),
  ],
  data: [
    q('d1', 'Write the logic to find the second highest salary per department in SQL.', ['dense_rank', 'window', 'partition', 'group by', 'subquery', 'order by', 'limit', 'distinct'], 'Medium'),
    q('d2', 'How do you handle missing data in a dataset?', ['impute', 'mean', 'median', 'drop', 'missing', 'bias', 'indicator', 'domain'], 'Easy'),
    q('d3', 'Explain the difference between correlation and causation with an example.', ['correlation', 'causation', 'confounder', 'experiment', 'a/b', 'randomized', 'spurious'], 'Easy'),
    q('d4', 'A KPI dropped 15% last week. How do you investigate?', ['segment', 'data quality', 'trend', 'seasonality', 'funnel', 'release', 'hypothesis', 'cohort'], 'Hard', 'Structure: verify data, segment, hypothesise.'),
    q('d5', 'When would you use a median instead of a mean?', ['outlier', 'skew', 'distribution', 'robust', 'income', 'median', 'mean'], 'Easy'),
    q('d6', 'Design a dashboard for a product manager tracking user retention.', ['cohort', 'retention', 'filter', 'metric', 'trend', 'segment', 'definition', 'refresh'], 'Medium'),
  ],
  ml: [
    q('m1', 'Explain the bias-variance trade-off.', ['bias', 'variance', 'overfitting', 'underfitting', 'regularization', 'complexity', 'validation'], 'Easy'),
    q('m2', 'How do you evaluate a classifier on an imbalanced dataset?', ['precision', 'recall', 'f1', 'roc', 'pr curve', 'resampling', 'class weight', 'threshold'], 'Medium'),
    q('m3', 'What is data leakage and how do you prevent it?', ['leakage', 'split', 'train', 'test', 'pipeline', 'time', 'feature', 'validation'], 'Medium'),
    q('m4', 'Explain how a CNN works for image classification.', ['convolution', 'filter', 'pooling', 'feature map', 'layer', 'relu', 'fully connected', 'backpropagation'], 'Medium'),
    q('m5', 'How would you deploy and monitor a model in production?', ['api', 'monitoring', 'drift', 'versioning', 'latency', 'retrain', 'batch', 'canary'], 'Hard'),
    q('m6', 'Why do we use regularization? Compare L1 and L2.', ['l1', 'l2', 'sparsity', 'weights', 'penalty', 'overfitting', 'lasso', 'ridge'], 'Medium'),
  ],
  cloud: [
    q('c1', 'Explain the difference between a Docker image and a container.', ['image', 'container', 'layer', 'registry', 'runtime', 'immutable', 'dockerfile'], 'Easy'),
    q('c2', 'How would you design a highly available web app on AWS?', ['multi-az', 'load balancer', 'auto scaling', 'rds', 'health check', 'cloudfront', 'failover', 'region'], 'Hard'),
    q('c3', 'What is Infrastructure as Code and why use Terraform?', ['declarative', 'state', 'plan', 'apply', 'version control', 'reproducible', 'module', 'drift'], 'Medium'),
    q('c4', 'Explain how a Kubernetes deployment performs a rolling update.', ['pod', 'replica', 'rolling', 'readiness', 'maxunavailable', 'rollback', 'replicaset', 'probe'], 'Medium'),
    q('c5', 'How do you secure an AWS account and workloads?', ['iam', 'least privilege', 'mfa', 'encryption', 'kms', 'security group', 'cloudtrail', 'vpc'], 'Medium'),
    q('c6', 'Describe a CI/CD pipeline you would build for a microservice.', ['build', 'test', 'artifact', 'deploy', 'stage', 'rollback', 'approval', 'pipeline'], 'Medium'),
  ],
  game: [
    q('g1', 'Explain the game loop and why delta time matters.', ['update', 'render', 'delta', 'frame', 'fixed', 'physics', 'fps', 'loop'], 'Easy'),
    q('g2', 'How would you convert a 2D image into a usable 3D asset automatically?', ['depth', 'mesh', 'normal', 'texture', 'uv', 'segmentation', 'export', 'pipeline'], 'Hard', 'Great question for your project!'),
    q('g3', 'What are quaternions and why are they used instead of Euler angles?', ['gimbal', 'rotation', 'interpolation', 'slerp', 'quaternion', 'euler', 'matrix'], 'Medium'),
    q('g4', 'How do you optimise draw calls in Unity?', ['batching', 'atlas', 'instancing', 'lod', 'occlusion', 'material', 'draw call', 'profiler'], 'Medium'),
    q('g5', 'Explain object pooling and when to use it.', ['pool', 'allocation', 'garbage', 'reuse', 'spawn', 'performance', 'bullets'], 'Easy'),
    q('g6', 'Design an editor tool that helps artists import assets faster.', ['pipeline', 'automation', 'validation', 'preset', 'batch', 'feedback', 'undo', 'naming'], 'Medium'),
  ],
}

export const HR_QUESTIONS = [
  q('h1', 'Tell me about yourself.', ['project', 'skills', 'college', 'interest', 'goal', 'experience'], 'Easy', 'Present, past, future in 60-90 seconds.'),
  q('h2', 'Describe a time you failed and what you learned.', ['situation', 'learned', 'result', 'improve', 'mistake', 'action'], 'Medium', 'Use STAR: Situation, Task, Action, Result.'),
  q('h3', 'Why should we hire you over other candidates?', ['skills', 'project', 'value', 'learn', 'fit', 'team'], 'Medium'),
  q('h4', 'Where do you see yourself in five years?', ['growth', 'learn', 'lead', 'skills', 'contribute', 'goal'], 'Easy'),
  q('h5', 'Tell me about a conflict in a team project and how you handled it.', ['listen', 'communicate', 'resolve', 'team', 'compromise', 'result'], 'Medium'),
]
