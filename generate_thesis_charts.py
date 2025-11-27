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
    """Create main comparison bar chart with 3 approaches - split into two subplots for better visibility"""
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

    # Split into two separate charts for better visibility
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7))

    # Chart 1: Success Rate, Hit Rate, Response Time
    categories1 = ['Success\nRate (%)', 'Hit\nRate (%)', 'Avg Response\nTime (ms)']
    baseline_vals1 = [
        baseline_metrics['successRate'] * 100,
        baseline_metrics['hitRate'] * 100,
        baseline_metrics['avgResponseTime']
    ]
    sh_vals1 = [
        sh_metrics['successRate'] * 100,
        sh_metrics['hitRate'] * 100,
        sh_metrics['avgResponseTime']
    ]
    ml_vals1 = [
        ml_metrics['successRate'] * 100,
        ml_metrics['hitRate'] * 100,
        ml_metrics['avgResponseTime']
    ]

    x1 = np.arange(len(categories1))
    width = 0.25

    bars1_1 = ax1.bar(x1 - width, baseline_vals1, width, label='Baseline',
                      color='#FF6B6B', alpha=0.8, edgecolor='black', linewidth=1.2)
    bars1_2 = ax1.bar(x1, sh_vals1, width, label='Self-Healing (No ML)',
                      color='#FFD93D', alpha=0.8, edgecolor='black', linewidth=1.2)
    bars1_3 = ax1.bar(x1 + width, ml_vals1, width, label='Self-Healing (ML)',
                      color='#4ECDC4', alpha=0.8, edgecolor='black', linewidth=1.2)

    # Add value labels
    for bars in [bars1_1, bars1_2, bars1_3]:
        for bar in bars:
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2., height,
                    f'{height:.1f}',
                    ha='center', va='bottom', fontsize=9, fontweight='bold')

    ax1.set_xlabel('Performance Metrics', fontsize=12, fontweight='bold')
    ax1.set_ylabel('Value', fontsize=12, fontweight='bold')
    ax1.set_title('Performance Metrics Comparison', fontsize=13, fontweight='bold', pad=15)
    ax1.set_xticks(x1)
    ax1.set_xticklabels(categories1)
    ax1.legend(loc='lower left', fontsize=10, framealpha=0.95, edgecolor='black')
    ax1.grid(axis='y', alpha=0.3, linestyle='--')
    ax1.set_axisbelow(True)

    # Chart 2: Total Errors (separate for better visibility)
    categories2 = ['Total Errors']
    baseline_vals2 = [baseline_metrics['failedRequests']]
    sh_vals2 = [sh_metrics['failedRequests']]
    ml_vals2 = [ml_metrics['failedRequests']]

    x2 = np.arange(len(categories2))

    bars2_1 = ax2.bar(x2 - width, baseline_vals2, width, label='Baseline',
                      color='#FF6B6B', alpha=0.8, edgecolor='black', linewidth=1.2)
    bars2_2 = ax2.bar(x2, sh_vals2, width, label='Self-Healing (No ML)',
                      color='#FFD93D', alpha=0.8, edgecolor='black', linewidth=1.2)
    bars2_3 = ax2.bar(x2 + width, ml_vals2, width, label='Self-Healing (ML)',
                      color='#4ECDC4', alpha=0.8, edgecolor='black', linewidth=1.2)

    # Add value labels (error counts only, no percentages)
    for i, (bars, vals, name) in enumerate([(bars2_1, baseline_vals2, 'Baseline'),
                                              (bars2_2, sh_vals2, 'Self-Healing'),
                                              (bars2_3, ml_vals2, 'ML')]):
        for bar, val in zip(bars, vals):
            height = bar.get_height()
            # Show actual value at the top
            ax2.text(bar.get_x() + bar.get_width()/2., height,
                    f'{int(height)}',
                    ha='center', va='bottom', fontsize=11, fontweight='bold')


    ax2.set_xlabel('Error Metrics', fontsize=12, fontweight='bold')
    ax2.set_ylabel('Number of Errors', fontsize=12, fontweight='bold')
    ax2.set_title('Total Errors Comparison\n(Lower is Better)', fontsize=13, fontweight='bold', pad=15)
    ax2.set_xticks(x2)
    ax2.set_xticklabels(categories2, fontsize=11)
    ax2.legend(loc='upper right', fontsize=10, framealpha=0.95, edgecolor='black')
    ax2.grid(axis='y', alpha=0.3, linestyle='--')
    ax2.set_axisbelow(True)

    # Add overall title
    fig.suptitle('Performance Comparison: Baseline vs Self-Healing vs ML-Enhanced',
                fontsize=15, fontweight='bold', y=0.98)

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    plt.savefig('charts/comparison_bar_chart_real.png', bbox_inches='tight', dpi=300)
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

    # Create chart with better layout
    labels = [
        'Self-Healing\nvs Baseline',
        'ML\nvs Baseline',
        'ML vs Self-Healing\n(No ML)'
    ]
    improvements = [sh_improvement, ml_improvement, ml_vs_sh_improvement]
    colors = ['#FFD93D', '#4ECDC4', '#51CF66']

    fig, ax = plt.subplots(figsize=(12, 7))

    bars = ax.barh(labels, improvements, color=colors, alpha=0.8,
                   edgecolor='black', linewidth=1.5)

    # Add value labels with smart positioning
    max_val = max(improvements)
    for i, (bar, val) in enumerate(zip(bars, improvements)):
        # Position label based on bar size
        if val < 10:  # Small values - place label outside bar
            x_pos = val + max_val * 0.03
            ha = 'left'
        else:  # Larger values - place label at end of bar
            x_pos = val + max_val * 0.02
            ha = 'left'

        ax.text(x_pos, i, f'+{val:.1f}%',
               va='center', ha=ha, fontsize=13, fontweight='bold',
               bbox=dict(boxstyle='round,pad=0.5', facecolor='white',
                        edgecolor='black', linewidth=1, alpha=0.9))

    # Add error counts as additional info
    error_info = f'Total Errors: Baseline={baseline_errors}, Self-Healing={sh_errors}, ML={ml_errors}'
    ax.text(0.5, -0.15, error_info, transform=ax.transAxes,
           ha='center', fontsize=10, style='italic',
           bbox=dict(boxstyle='round,pad=0.8', facecolor='lightyellow', alpha=0.8))

    ax.set_xlabel('Error Reduction (%)', fontsize=13, fontweight='bold')
    ax.set_title('Error Reduction Comparison: Self-Healing vs ML-Enhanced',
                fontsize=15, fontweight='bold', pad=20)
    ax.grid(axis='x', alpha=0.3, linestyle='--', linewidth=1)
    ax.set_axisbelow(True)
    ax.axvline(x=0, color='black', linewidth=1.5)

    # Set x-axis limit with more padding to ensure labels are visible
    ax.set_xlim(0, max_val * 1.25)

    # Improve tick labels
    ax.tick_params(axis='y', labelsize=11)
    ax.tick_params(axis='x', labelsize=10)

    plt.tight_layout()
    plt.savefig('charts/improvement_chart_real.png', bbox_inches='tight', dpi=300)
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
    plt.close()

def main():
    print("📊 Generating thesis charts...")

    # Find latest experiment
    results_dir = Path('experiment_results')
    experiment_files = list(results_dir.glob('experiment_*.json'))
    if not experiment_files:
        print("❌ No experiment files found!")
        return

    latest_experiment = max(experiment_files, key=lambda p: p.stat().st_mtime)
    print(f"Using: {latest_experiment.name}")

    # Create charts
    create_comparison_bar_chart(latest_experiment)
    create_improvement_chart(latest_experiment)
    create_summary_table(latest_experiment)

    print("✅ Charts generated successfully!")


if __name__ == '__main__':
    main()
