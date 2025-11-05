#!/usr/bin/env python3
"""
Generate charts for thesis using REAL experiment data
Shows comparison of 3 approaches: Baseline, Self-Healing (no ML), ML
"""

import json
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

# Set style for scientific paper
plt.style.use('seaborn-v0_8-paper')
plt.rcParams['figure.dpi'] = 300
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['font.size'] = 10
plt.rcParams['font.family'] = 'serif'

def load_experiment(experiment_file):
    """Load experiment data from JSON"""
    with open(experiment_file, 'r') as f:
        return json.load(f)

def create_comparison_bar_chart(experiment_file):
    """Create main comparison bar chart with 3 approaches"""
    data = load_experiment(experiment_file)
    scenarios = data['scenarios']

    # Calculate aggregated metrics
    baseline_metrics = {
        'failedRequests': sum(s['baseline']['failedRequests'] for s in scenarios.values()),
        'totalRequests': sum(s['baseline']['totalRequests'] for s in scenarios.values()),
        'successRate': np.mean([s['baseline']['successRate'] for s in scenarios.values()]),
        'hitRate': np.mean([s['baseline']['hitRate'] for s in scenarios.values()]),
        'avgResponseTime': np.mean([s['baseline']['avgResponseTime'] for s in scenarios.values()])
    }

    sh_metrics = {
        'failedRequests': sum(s['selfHealing']['failedRequests'] for s in scenarios.values()),
        'totalRequests': sum(s['selfHealing']['totalRequests'] for s in scenarios.values()),
        'successRate': np.mean([s['selfHealing']['successRate'] for s in scenarios.values()]),
        'hitRate': np.mean([s['selfHealing']['hitRate'] for s in scenarios.values()]),
        'avgResponseTime': np.mean([s['selfHealing']['avgResponseTime'] for s in scenarios.values()])
    }

    ml_metrics = {
        'failedRequests': sum(s['selfHealingML']['failedRequests'] for s in scenarios.values()),
        'totalRequests': sum(s['selfHealingML']['totalRequests'] for s in scenarios.values()),
        'successRate': np.mean([s['selfHealingML']['successRate'] for s in scenarios.values()]),
        'hitRate': np.mean([s['selfHealingML']['hitRate'] for s in scenarios.values()]),
        'avgResponseTime': np.mean([s['selfHealingML']['avgResponseTime'] for s in scenarios.values()])
    }

    # Create chart
    categories = ['Success\nRate (%)', 'Hit\nRate (%)', 'Avg Response\nTime (ms)', 'Total\nErrors']
    baseline_vals = [
        baseline_metrics['successRate'] * 100,
        baseline_metrics['hitRate'] * 100,
        baseline_metrics['avgResponseTime'],
        baseline_metrics['failedRequests']
    ]
    sh_vals = [
        sh_metrics['successRate'] * 100,
        sh_metrics['hitRate'] * 100,
        sh_metrics['avgResponseTime'],
        sh_metrics['failedRequests']
    ]
    ml_vals = [
        ml_metrics['successRate'] * 100,
        ml_metrics['hitRate'] * 100,
        ml_metrics['avgResponseTime'],
        ml_metrics['failedRequests']
    ]

    x = np.arange(len(categories))
    width = 0.25

    fig, ax = plt.subplots(figsize=(12, 7))

    bars1 = ax.bar(x - width, baseline_vals, width, label='Baseline',
                   color='#FF6B6B', alpha=0.8, edgecolor='black', linewidth=1.2)
    bars2 = ax.bar(x, sh_vals, width, label='Self-Healing (No ML)',
                   color='#FFD93D', alpha=0.8, edgecolor='black', linewidth=1.2)
    bars3 = ax.bar(x + width, ml_vals, width, label='Self-Healing (ML)',
                   color='#4ECDC4', alpha=0.8, edgecolor='black', linewidth=1.2)

    # Add value labels
    for bars in [bars1, bars2, bars3]:
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{height:.1f}',
                   ha='center', va='bottom', fontsize=9, fontweight='bold')

    ax.set_xlabel('Metrics', fontsize=12, fontweight='bold')
    ax.set_ylabel('Value', fontsize=12, fontweight='bold')
    ax.set_title('Performance Comparison: Baseline vs Self-Healing vs ML',
                fontsize=14, fontweight='bold', pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(categories)
    ax.legend(loc='upper right', fontsize=11, framealpha=0.9)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_axisbelow(True)

    plt.tight_layout()
    plt.savefig('charts/comparison_bar_chart_real.png', bbox_inches='tight', dpi=300)
    print('✓ Created: charts/comparison_bar_chart_real.png')
    plt.close()

def create_improvement_chart(experiment_file):
    """Create improvement chart showing % improvements"""
    data = load_experiment(experiment_file)
    scenarios = data['scenarios']

    # Calculate total errors
    baseline_errors = sum(s['baseline']['failedRequests'] for s in scenarios.values())
    sh_errors = sum(s['selfHealing']['failedRequests'] for s in scenarios.values())
    ml_errors = sum(s['selfHealingML']['failedRequests'] for s in scenarios.values())

    # Calculate improvements
    sh_improvement = (baseline_errors - sh_errors) / baseline_errors * 100
    ml_improvement = (baseline_errors - ml_errors) / baseline_errors * 100
    ml_vs_sh_improvement = (sh_errors - ml_errors) / sh_errors * 100 if sh_errors > 0 else 0

    # Create chart
    labels = [
        'Self-Healing\nvs Baseline',
        'ML\nvs Baseline',
        'ML\nvs Self-Healing'
    ]
    improvements = [sh_improvement, ml_improvement, ml_vs_sh_improvement]
    colors = ['#FFD93D', '#4ECDC4', '#51CF66']

    fig, ax = plt.subplots(figsize=(10, 6))

    bars = ax.barh(labels, improvements, color=colors, alpha=0.8,
                   edgecolor='black', linewidth=1.2)

    # Add value labels
    for i, (bar, val) in enumerate(zip(bars, improvements)):
        ax.text(val + 2, i, f'+{val:.1f}%',
               va='center', fontsize=12, fontweight='bold')

    ax.set_xlabel('Error Reduction (%)', fontsize=12, fontweight='bold')
    ax.set_title('Error Reduction: Improvements Over Baseline',
                fontsize=14, fontweight='bold', pad=20)
    ax.grid(axis='x', alpha=0.3, linestyle='--')
    ax.set_axisbelow(True)
    ax.axvline(x=0, color='black', linewidth=1)
    ax.set_xlim(0, 100)

    plt.tight_layout()
    plt.savefig('charts/improvement_chart_real.png', bbox_inches='tight', dpi=300)
    print('✓ Created: charts/improvement_chart_real.png')
    plt.close()

def create_summary_table(experiment_file):
    """Create summary comparison table"""
    data = load_experiment(experiment_file)
    scenarios = data['scenarios']

    fig, ax = plt.subplots(figsize=(14, 10))
    ax.axis('tight')
    ax.axis('off')

    # Prepare table data
    table_data = [
        ['Scenario', 'Baseline\nErrors', 'Self-Healing\nErrors', 'ML\nErrors',
         'SH Improvement\nvs Baseline', 'ML Improvement\nvs Baseline', 'Winner']
    ]

    for name, scenario in scenarios.items():
        b_err = scenario['baseline']['failedRequests']
        sh_err = scenario['selfHealing']['failedRequests']
        ml_err = scenario['selfHealingML']['failedRequests']

        sh_imp = ((b_err - sh_err) / b_err * 100) if b_err > 0 else 0
        ml_imp = ((b_err - ml_err) / b_err * 100) if b_err > 0 else 0

        winner = 'ML' if ml_err <= sh_err else 'Self-Healing'
        if ml_err == sh_err:
            winner = 'Tie'

        table_data.append([
            name.replace('_', ' ').title(),
            str(b_err),
            str(sh_err),
            str(ml_err),
            f'+{sh_imp:.1f}%',
            f'+{ml_imp:.1f}%',
            winner
        ])

    # Add totals
    total_b = sum(s['baseline']['failedRequests'] for s in scenarios.values())
    total_sh = sum(s['selfHealing']['failedRequests'] for s in scenarios.values())
    total_ml = sum(s['selfHealingML']['failedRequests'] for s in scenarios.values())

    total_sh_imp = (total_b - total_sh) / total_b * 100
    total_ml_imp = (total_b - total_ml) / total_b * 100

    table_data.append([
        'TOTAL',
        str(total_b),
        str(total_sh),
        str(total_ml),
        f'+{total_sh_imp:.1f}%',
        f'+{total_ml_imp:.1f}%',
        'ML' if total_ml <= total_sh else 'Self-Healing'
    ])

    table = ax.table(cellText=table_data, cellLoc='center', loc='center',
                     colWidths=[0.20, 0.12, 0.12, 0.12, 0.15, 0.15, 0.14])

    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1, 2.5)

    # Style header
    for i in range(7):
        cell = table[(0, i)]
        cell.set_facecolor('#4ECDC4')
        cell.set_text_props(weight='bold', color='white')

    # Style total row
    for i in range(7):
        cell = table[(len(table_data)-1, i)]
        cell.set_facecolor('#FFD93D')
        cell.set_text_props(weight='bold')

    # Color winner column
    for i in range(1, len(table_data)):
        winner = table_data[i][6]
        cell = table[(i, 6)]
        if winner == 'ML':
            cell.set_facecolor('#51CF66')
            cell.set_text_props(weight='bold')
        elif winner == 'Self-Healing':
            cell.set_facecolor('#FFD93D')
            cell.set_text_props(weight='bold')

    plt.title('Detailed Comparison: Baseline vs Self-Healing vs ML',
             fontsize=14, fontweight='bold', pad=20)

    plt.tight_layout()
    plt.savefig('charts/summary_table_real.png', bbox_inches='tight', dpi=300)
    print('✓ Created: charts/summary_table_real.png')
    plt.close()

def main():
    print("\n🎨 Generating REAL DATA charts for thesis...\n")

    # Find latest experiment
    results_dir = Path('experiment_results')
    experiment_files = list(results_dir.glob('experiment_*.json'))
    if not experiment_files:
        print("❌ No experiment files found!")
        return

    latest_experiment = max(experiment_files, key=lambda p: p.stat().st_mtime)
    print(f"📊 Using experiment: {latest_experiment.name}\n")

    # Create charts
    create_comparison_bar_chart(latest_experiment)
    create_improvement_chart(latest_experiment)
    create_summary_table(latest_experiment)

    print("\n✅ Real data charts generated successfully!")
    print("\n📁 Generated files:")
    print("  1. comparison_bar_chart_real.png - 3-way comparison")
    print("  2. improvement_chart_real.png - % improvements")
    print("  3. summary_table_real.png - detailed table")
    print("\n💡 Use these for your thesis presentation!\n")

if __name__ == '__main__':
    main()
