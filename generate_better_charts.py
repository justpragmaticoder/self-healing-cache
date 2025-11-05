#!/usr/bin/env python3
"""
Generate better charts with proper scale to show differences
"""

import json
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

plt.style.use('seaborn-v0_8-paper')
plt.rcParams['figure.dpi'] = 300
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['font.size'] = 10
plt.rcParams['font.family'] = 'serif'

def load_experiment(experiment_file):
    with open(experiment_file, 'r') as f:
        return json.load(f)

def create_error_reduction_chart(experiment_file):
    """Focus on ERROR REDUCTION - the most visible difference"""
    data = load_experiment(experiment_file)
    scenarios = data['scenarios']

    scenario_names = []
    baseline_errors = []
    sh_errors = []
    ml_errors = []

    for name, scenario in scenarios.items():
        scenario_names.append(name.replace('_', '\n').title())
        baseline_errors.append(scenario['baseline']['failedRequests'])
        sh_errors.append(scenario['selfHealing']['failedRequests'])
        ml_errors.append(scenario['selfHealingML']['failedRequests'])

    x = np.arange(len(scenario_names))
    width = 0.25

    fig, ax = plt.subplots(figsize=(14, 8))

    bars1 = ax.bar(x - width, baseline_errors, width, label='Baseline',
                   color='#FF6B6B', alpha=0.8, edgecolor='black', linewidth=1.2)
    bars2 = ax.bar(x, sh_errors, width, label='Self-Healing (No ML)',
                   color='#FFD93D', alpha=0.8, edgecolor='black', linewidth=1.2)
    bars3 = ax.bar(x + width, ml_errors, width, label='Self-Healing (ML)',
                   color='#4ECDC4', alpha=0.8, edgecolor='black', linewidth=1.2)

    # Add value labels
    for bars in [bars1, bars2, bars3]:
        for bar in bars:
            height = bar.get_height()
            if height > 0:
                ax.text(bar.get_x() + bar.get_width()/2., height,
                       f'{int(height)}',
                       ha='center', va='bottom', fontsize=9, fontweight='bold')

    ax.set_xlabel('Scenarios', fontsize=12, fontweight='bold')
    ax.set_ylabel('Number of Failed Requests', fontsize=12, fontweight='bold')
    ax.set_title('Failed Requests by Scenario: Clear Hierarchy',
                fontsize=14, fontweight='bold', pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(scenario_names, fontsize=9)
    ax.legend(loc='upper right', fontsize=11, framealpha=0.9)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_axisbelow(True)

    plt.tight_layout()
    plt.savefig('charts/error_reduction_by_scenario.png', bbox_inches='tight', dpi=300)
    print('✓ Created: charts/error_reduction_by_scenario.png')
    plt.close()

def create_success_rate_zoomed(experiment_file):
    """Success Rate with ZOOMED scale (95-100%) to show differences"""
    data = load_experiment(experiment_file)
    scenarios = data['scenarios']

    scenario_names = []
    baseline_sr = []
    sh_sr = []
    ml_sr = []

    for name, scenario in scenarios.items():
        scenario_names.append(name.replace('_', '\n').title())
        baseline_sr.append(scenario['baseline']['successRate'] * 100)
        sh_sr.append(scenario['selfHealing']['successRate'] * 100)
        ml_sr.append(scenario['selfHealingML']['successRate'] * 100)

    x = np.arange(len(scenario_names))
    width = 0.25

    fig, ax = plt.subplots(figsize=(14, 8))

    bars1 = ax.bar(x - width, baseline_sr, width, label='Baseline',
                   color='#FF6B6B', alpha=0.8, edgecolor='black', linewidth=1.2)
    bars2 = ax.bar(x, sh_sr, width, label='Self-Healing (No ML)',
                   color='#FFD93D', alpha=0.8, edgecolor='black', linewidth=1.2)
    bars3 = ax.bar(x + width, ml_sr, width, label='Self-Healing (ML)',
                   color='#4ECDC4', alpha=0.8, edgecolor='black', linewidth=1.2)

    # Add value labels
    for bars in [bars1, bars2, bars3]:
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + 0.02,
                   f'{height:.2f}%',
                   ha='center', va='bottom', fontsize=8, fontweight='bold')

    ax.set_xlabel('Scenarios', fontsize=12, fontweight='bold')
    ax.set_ylabel('Success Rate (%)', fontsize=12, fontweight='bold')
    ax.set_title('Success Rate Comparison (Zoomed Scale)',
                fontsize=14, fontweight='bold', pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(scenario_names, fontsize=9)
    ax.legend(loc='lower right', fontsize=11, framealpha=0.9)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_axisbelow(True)

    # ZOOM to 95-100% to show differences
    ax.set_ylim(95, 100.5)

    plt.tight_layout()
    plt.savefig('charts/success_rate_zoomed.png', bbox_inches='tight', dpi=300)
    print('✓ Created: charts/success_rate_zoomed.png')
    plt.close()

def create_combined_metrics_chart(experiment_file):
    """4 separate charts to show each metric clearly"""
    data = load_experiment(experiment_file)
    scenarios = data['scenarios']

    # Aggregate data
    total_b_errors = sum(s['baseline']['failedRequests'] for s in scenarios.values())
    total_sh_errors = sum(s['selfHealing']['failedRequests'] for s in scenarios.values())
    total_ml_errors = sum(s['selfHealingML']['failedRequests'] for s in scenarios.values())

    avg_b_sr = np.mean([s['baseline']['successRate'] for s in scenarios.values()]) * 100
    avg_sh_sr = np.mean([s['selfHealing']['successRate'] for s in scenarios.values()]) * 100
    avg_ml_sr = np.mean([s['selfHealingML']['successRate'] for s in scenarios.values()]) * 100

    avg_b_hr = np.mean([s['baseline']['hitRate'] for s in scenarios.values()]) * 100
    avg_sh_hr = np.mean([s['selfHealing']['hitRate'] for s in scenarios.values()]) * 100
    avg_ml_hr = np.mean([s['selfHealingML']['hitRate'] for s in scenarios.values()]) * 100

    avg_b_lat = np.mean([s['baseline']['avgResponseTime'] for s in scenarios.values()])
    avg_sh_lat = np.mean([s['selfHealing']['avgResponseTime'] for s in scenarios.values()])
    avg_ml_lat = np.mean([s['selfHealingML']['avgResponseTime'] for s in scenarios.values()])

    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(14, 10))

    x = np.arange(3)
    labels = ['Baseline', 'Self-Healing\n(No ML)', 'Self-Healing\n(ML)']
    colors = ['#FF6B6B', '#FFD93D', '#4ECDC4']

    # 1. Total Errors (linear scale - good visibility)
    errors = [total_b_errors, total_sh_errors, total_ml_errors]
    bars = ax1.bar(x, errors, color=colors, alpha=0.8, edgecolor='black', linewidth=1.2)
    for bar, val in zip(bars, errors):
        ax1.text(bar.get_x() + bar.get_width()/2., val,
                f'{int(val)}',
                ha='center', va='bottom', fontsize=11, fontweight='bold')
    ax1.set_ylabel('Total Failed Requests', fontsize=11, fontweight='bold')
    ax1.set_title('Total Errors (Lower is Better)', fontsize=12, fontweight='bold')
    ax1.set_xticks(x)
    ax1.set_xticklabels(labels, fontsize=10)
    ax1.grid(axis='y', alpha=0.3)

    # 2. Success Rate (zoomed 95-100%)
    success_rates = [avg_b_sr, avg_sh_sr, avg_ml_sr]
    bars = ax2.bar(x, success_rates, color=colors, alpha=0.8, edgecolor='black', linewidth=1.2)
    for bar, val in zip(bars, success_rates):
        ax2.text(bar.get_x() + bar.get_width()/2., val + 0.05,
                f'{val:.2f}%',
                ha='center', va='bottom', fontsize=11, fontweight='bold')
    ax2.set_ylabel('Success Rate (%)', fontsize=11, fontweight='bold')
    ax2.set_title('Avg Success Rate (Zoomed)', fontsize=12, fontweight='bold')
    ax2.set_xticks(x)
    ax2.set_xticklabels(labels, fontsize=10)
    ax2.set_ylim(99.0, 100.2)
    ax2.grid(axis='y', alpha=0.3)

    # 3. Hit Rate (zoomed 95-100%)
    hit_rates = [avg_b_hr, avg_sh_hr, avg_ml_hr]
    bars = ax3.bar(x, hit_rates, color=colors, alpha=0.8, edgecolor='black', linewidth=1.2)
    for bar, val in zip(bars, hit_rates):
        ax3.text(bar.get_x() + bar.get_width()/2., val + 0.05,
                f'{val:.2f}%',
                ha='center', va='bottom', fontsize=11, fontweight='bold')
    ax3.set_ylabel('Hit Rate (%)', fontsize=11, fontweight='bold')
    ax3.set_title('Avg Hit Rate (Zoomed)', fontsize=12, fontweight='bold')
    ax3.set_xticks(x)
    ax3.set_xticklabels(labels, fontsize=10)
    ax3.set_ylim(96.5, 98.5)
    ax3.grid(axis='y', alpha=0.3)

    # 4. Response Time
    latencies = [avg_b_lat, avg_sh_lat, avg_ml_lat]
    bars = ax4.bar(x, latencies, color=colors, alpha=0.8, edgecolor='black', linewidth=1.2)
    for bar, val in zip(bars, latencies):
        ax4.text(bar.get_x() + bar.get_width()/2., val,
                f'{val:.2f}ms',
                ha='center', va='bottom', fontsize=11, fontweight='bold')
    ax4.set_ylabel('Avg Response Time (ms)', fontsize=11, fontweight='bold')
    ax4.set_title('Avg Response Time (Trade-off)', fontsize=12, fontweight='bold')
    ax4.set_xticks(x)
    ax4.set_xticklabels(labels, fontsize=10)
    ax4.grid(axis='y', alpha=0.3)

    plt.suptitle('Comprehensive Performance Comparison', fontsize=16, fontweight='bold', y=0.995)
    plt.tight_layout()
    plt.savefig('charts/comprehensive_comparison.png', bbox_inches='tight', dpi=300)
    print('✓ Created: charts/comprehensive_comparison.png')
    plt.close()

def main():
    print("\n🎨 Generating IMPROVED charts with better visibility...\n")

    results_dir = Path('experiment_results')
    experiment_files = list(results_dir.glob('experiment_*.json'))
    if not experiment_files:
        print("❌ No experiment files found!")
        return

    latest_experiment = max(experiment_files, key=lambda p: p.stat().st_mtime)
    print(f"📊 Using experiment: {latest_experiment.name}\n")

    create_error_reduction_chart(latest_experiment)
    create_success_rate_zoomed(latest_experiment)
    create_combined_metrics_chart(latest_experiment)

    print("\n✅ Improved charts generated!")
    print("\n📁 New charts:")
    print("  1. error_reduction_by_scenario.png - Shows CLEAR hierarchy in errors")
    print("  2. success_rate_zoomed.png - Zoomed scale to show small differences")
    print("  3. comprehensive_comparison.png - 4 metrics with proper scales")
    print("\n💡 These charts show differences much better!\n")

if __name__ == '__main__':
    main()
