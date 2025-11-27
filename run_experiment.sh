#!/bin/bash

echo "🚀 Starting Self-Healing Cache Experiment..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start infrastructure
echo -e "${BLUE}Step 1: Starting Docker infrastructure (Redis + MySQL)...${NC}"
docker-compose up -d redis mysql

# Wait for Redis
echo "  ⏳ Waiting for Redis..."
sleep 3
if ! docker ps | grep -q "redis"; then
    echo "❌ Redis failed to start"
    exit 1
fi

# Wait for MySQL to be ready using healthcheck
echo "  ⏳ Waiting for MySQL to be healthy (this may take 15-30 seconds)..."
MAX_TRIES=30
TRIES=0

until docker ps --filter "name=mysql" --filter "health=healthy" --format "{{.Names}}" | grep -q mysql || [ $TRIES -eq $MAX_TRIES ]; do
    TRIES=$((TRIES+1))
    if [ $((TRIES % 5)) -eq 0 ]; then
        echo "  ⏳ Still waiting for MySQL... (attempt $TRIES/$MAX_TRIES)"
    fi
    sleep 2
done

if [ $TRIES -eq $MAX_TRIES ]; then
    echo "❌ MySQL failed to become healthy"
    docker ps -a --filter "name=mysql"
    exit 1
fi

echo "  ✓ MySQL is healthy"
sleep 2

echo -e "${GREEN}✓ Docker infrastructure running and ready${NC}"
echo ""

# Step 2: Build the application
echo -e "${BLUE}Step 2: Building application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Step 3: Start application in background
echo -e "${BLUE}Step 3: Starting NestJS application...${NC}"
npm run start:dev > /tmp/nest-app.log 2>&1 &
APP_PID=$!

# Wait for app to start
echo "  ⏳ Waiting for NestJS to start..."
MAX_TRIES=20
TRIES=0
until curl -s http://localhost:3000/api/cache/health > /dev/null 2>&1 || [ $TRIES -eq $MAX_TRIES ]; do
    TRIES=$((TRIES+1))
    if [ $((TRIES % 5)) -eq 0 ]; then
        echo "  ⏳ Still waiting for app... (attempt $TRIES/$MAX_TRIES)"
    fi
    sleep 2
done

if [ $TRIES -eq $MAX_TRIES ]; then
    echo "❌ Application failed to start"
    echo "Last 20 lines of log:"
    tail -20 /tmp/nest-app.log
    kill $APP_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✓ Application running at http://localhost:3000${NC}"
echo ""

# Step 4: Run comprehensive cache comparison experiment
echo -e "${BLUE}Step 4: Running COMPREHENSIVE CACHE COMPARISON...${NC}"
echo ""
echo "  This will test 3 cache strategies across 3 scenarios:"
echo "  1️⃣  Baseline (Traditional Cache)"
echo "  2️⃣  Self-Healing Cache (No ML)"
echo "  3️⃣  Self-Healing Cache (With ML)"
echo ""
echo "  Scenarios:"
echo "  📊 Normal Operation (1000 requests, 5% failure rate)"
echo "  ⚠️  High Failure (500 requests, 30% failure rate)"
echo "  🔥 Burst Traffic (1000 requests, alternating conditions)"
echo ""
echo "  ⏳ This will take approximately 5 minutes..."
echo ""

COMPARISON_RESPONSE=$(curl -s -X POST http://localhost:3000/api/experiments/run-comparison)
EXPERIMENT_ID=$(echo "$COMPARISON_RESPONSE" | jq -r '.report.experimentId')

if [ -z "$EXPERIMENT_ID" ] || [ "$EXPERIMENT_ID" == "null" ]; then
    echo "❌ Experiment failed to run"
    echo "$COMPARISON_RESPONSE" | jq '.'
    kill $APP_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✓ Comprehensive experiment completed${NC}"
echo "  📁 Results ID: $EXPERIMENT_ID"
echo ""

# Step 5: Show results
echo -e "${YELLOW}========================================= RESULTS ==========================================${NC}"
echo ""

RESULT_FILE="experiment_results/${EXPERIMENT_ID}.json"

if [ -f "$RESULT_FILE" ]; then
    echo -e "${BLUE}📊 OVERALL SUMMARY${NC}"
    echo ""
    jq -r '.summary | "  🏆 Best Performer: \(.bestPerformer)\n\n  Overall Improvements (vs Baseline):\n  ✓ Success Rate: +\(.overallImprovements.avgSuccessRateImprovement | tonumber | . * 100 | round / 100)%\n  ✓ Hit Rate: +\(.overallImprovements.avgHitRateImprovement | tonumber | . * 100 | round / 100)%\n  ✓ Response Time: +\(.overallImprovements.avgResponseTimeImprovement | tonumber | . * 100 | round / 100)%\n  ✓ Throughput: +\(.overallImprovements.avgThroughputImprovement | tonumber | . * 100 | round / 100)%"' "$RESULT_FILE"
    echo ""
    echo ""

    echo -e "${BLUE}📈 SCENARIO BREAKDOWN${NC}"
    echo ""

    for scenario in "normal" "high_failure" "burst_traffic"; do
        SCENARIO_DISPLAY=$(echo "$scenario" | tr '_' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}  Scenario: $SCENARIO_DISPLAY${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""

        jq -r --arg scenario "$scenario" '
        .scenarios[$scenario] as $s |
        "  \u001b[36m1️⃣  Baseline (Traditional Cache)\u001b[0m\n" +
        "     Success Rate: \($s.baseline.successRate * 100 | round / 100)% | " +
        "Hit Rate: \($s.baseline.hitRate * 100 | round / 100)% | " +
        "Avg Response: \($s.baseline.avgResponseTime | round / 100)ms | " +
        "Throughput: \($s.baseline.throughput | round / 100) req/s\n\n" +
        "  \u001b[36m2️⃣  Self-Healing (No ML)\u001b[0m\n" +
        "     Success Rate: \($s.selfHealing.successRate * 100 | round / 100)% | " +
        "Hit Rate: \($s.selfHealing.hitRate * 100 | round / 100)% | " +
        "Avg Response: \($s.selfHealing.avgResponseTime | round / 100)ms | " +
        "Throughput: \($s.selfHealing.throughput | round / 100) req/s\n\n" +
        "  \u001b[36m3️⃣  Self-Healing (With ML)\u001b[0m\n" +
        "     Success Rate: \($s.selfHealingML.successRate * 100 | round / 100)% | " +
        "Hit Rate: \($s.selfHealingML.hitRate * 100 | round / 100)% | " +
        "Avg Response: \($s.selfHealingML.avgResponseTime | round / 100)ms | " +
        "Throughput: \($s.selfHealingML.throughput | round / 100) req/s\n\n" +
        "  \u001b[32m✨ Improvements (Self-Healing ML vs Baseline)\u001b[0m\n" +
        "     Success Rate: +\($s.improvements.successRateImprovement.vsBaseline | round / 100)% | " +
        "Hit Rate: +\($s.improvements.hitRateImprovement.vsBaseline | round / 100)% | " +
        "Response Time: +\($s.improvements.responseTimeImprovement.vsBaseline | round / 100)% | " +
        "Throughput: +\($s.improvements.throughputImprovement.vsBaseline | round / 100)%\n\n" +
        "  \u001b[32m✨ Improvements (Self-Healing ML vs No ML)\u001b[0m\n" +
        "     Success Rate: +\($s.improvements.successRateImprovement.vsNoML | round / 100)% | " +
        "Hit Rate: +\($s.improvements.hitRateImprovement.vsNoML | round / 100)% | " +
        "Response Time: +\($s.improvements.responseTimeImprovement.vsNoML | round / 100)% | " +
        "Throughput: +\($s.improvements.throughputImprovement.vsNoML | round / 100)%\n"
        ' "$RESULT_FILE"
        echo ""
    done

    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════════════════════════${NC}"
else
    echo "⚠️  Results file not found: $RESULT_FILE"
fi
echo ""

# Step 6: Files already exported by experiment runner
echo -e "${BLUE}Step 6: Verifying exported data...${NC}"
if [ -f "experiment_results/cache_statistics.json" ]; then
    echo -e "${GREEN}✓ Cache statistics exported${NC}"
else
    echo "⚠️  Cache statistics file not found"
fi
if [ -f "experiment_results/ml_training_data.json" ]; then
    echo -e "${GREEN}✓ ML training data exported${NC}"
else
    echo "⚠️  ML training data file not found"
fi
echo ""

# Step 7: Generate charts
echo -e "${BLUE}Step 7: Generating charts from experiment results...${NC}"
echo ""

# Check if Python virtual environment exists, create if not
if [ ! -d "/tmp/venv" ]; then
    echo "  ⏳ Creating Python virtual environment..."
    python3 -m venv /tmp/venv
fi

# Activate venv and install dependencies
source /tmp/venv/bin/activate

# Check if matplotlib is installed
if ! python3 -c "import matplotlib" 2>/dev/null; then
    echo "  ⏳ Installing chart dependencies..."
    pip install matplotlib numpy --quiet
fi

# Generate charts
echo "  📊 Generating better charts..."
python3 generate_better_charts.py

echo "  📊 Generating thesis charts..."
python3 generate_thesis_charts.py

deactivate

echo ""
echo -e "${GREEN}✓ Charts generated successfully${NC}"
echo "  📁 Charts saved in: ./charts/"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✅ All experiments completed successfully!${NC}"
echo ""
echo "📁 Results saved in:"
echo "   • Main Report: ./experiment_results/${EXPERIMENT_ID}.json"
echo "   • Cache Stats: ./experiment_results/cache_statistics.json"
echo "   • ML Data: ./experiment_results/ml_training_data.json"
echo ""
echo "🔍 Quick Stats:"
echo "   • Baseline: Traditional cache without self-healing"
echo "   • Self-Healing (No ML): Adaptive recovery without predictions"
echo "   • Self-Healing (ML): Full ML-powered failure prediction + recovery"
echo ""
echo "🌐 Application running at: http://localhost:3000"
echo "📊 API Endpoints:"
echo "   • GET  /api/cache/stats"
echo "   • GET  /api/experiments"
echo "   • POST /api/experiments/run-comparison"
echo ""
echo "To stop the application:"
echo "  kill $APP_PID"
echo "  docker-compose down"
echo ""
echo "Or press Ctrl+C to stop now and clean up"
echo ""

# Wait for user interrupt
trap "echo ''; echo 'Stopping...'; kill $APP_PID 2>/dev/null; docker-compose down; exit 0" INT
wait $APP_PID
