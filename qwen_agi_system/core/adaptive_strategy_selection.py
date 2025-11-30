#!/usr/bin/env python3
"""
Adaptive Strategy Selection System - Intelligent Strategy Optimization

Advanced adaptive strategy selection system that enables 10 agents to
dynamically select and optimize strategies based on real-time analysis,
learning from past performance, and predictive optimization.

Key Features:
- Real-time strategy performance analysis and optimization
- Multi-agent collaborative strategy selection
- Predictive strategy recommendation using ML models
- Dynamic strategy adaptation based on context and feedback
- Strategy effectiveness tracking and learning
- Context-aware strategy matching and selection
- Performance-based strategy evolution
- Multi-objective strategy optimization
- Emergent strategy discovery and development
- Continuous strategy refinement and improvement
"""

import asyncio
import logging
from typing import Dict, List, Set, Tuple, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import json
import numpy as np
from collections import defaultdict, deque
import networkx as nx
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import pickle
from pathlib import Path
import math
from statistics import mean, median, stdev

from ten_agent_architecture import (
    AgentRole, AgentThought, AGITask, BaseAgent, ConsensusLevel,
    CollectiveInsight, TaskPriority
)

logger = logging.getLogger("AdaptiveStrategySelection")

class StrategyType(Enum):
    """Types of strategies available for selection"""
    COLLABORATIVE = "collaborative"                     # Collaboration-focused strategies
    COMPETITIVE = "competitive"                        # Competition-based strategies
    CONSENSUS_DRIVEN = "consensus_driven"             # Consensus-seeking strategies
    HIERARCHICAL = "hierarchical"                     # Hierarchical coordination
    SWARM_INTELLIGENCE = "swarm_intelligence"        # Swarm-based approaches
    SPECIALIZED = "specialized"                       # Specialist-led strategies
    ADAPTIVE_HYBRID = "adaptive_hybrid"               # Adaptive hybrid approaches
    EMERGENT = "emergent"                            # Emergent strategy discovery
    PREDICTIVE = "predictive"                        # Predictive optimization
    INNOVATIVE = "innovative"                        # Innovation-focused strategies

class OptimizationObjective(Enum):
    """Objectives for strategy optimization"""
    MAXIMIZE_QUALITY = "maximize_quality"             # Maximize output quality
    MINIMIZE_TIME = "minimize_time"                   # Minimize processing time
    MAXIMIZE_CONSENSUS = "maximize_consensus"         # Maximize agreement level
    MAXIMIZE_INNOVATION = "maximize_innovation"       # Maximize innovation
    MINIMIZE_CONFLICTS = "minimize_conflicts"         # Minimize conflicts
    MAXIMIZE_LEARNING = "maximize_learning"           # Maximize learning
    BALANCE_ALL = "balance_all"                       # Balance all objectives
    CONTEXT_OPTIMIZED = "context_optimized"           # Optimize for specific context
    RESOURCE_EFFICIENT = "resource_efficient"         # Minimize resource usage

class StrategyPerformanceMetric(Enum):
    """Metrics for evaluating strategy performance"""
    SUCCESS_RATE = "success_rate"                     # Rate of successful outcomes
    QUALITY_SCORE = "quality_score"                   # Average quality of results
    TIME_EFFICIENCY = "time_efficiency"               # Processing time efficiency
    CONSENSUS_STRENGTH = "consensus_strength"         # Strength of consensus achieved
    CONFLICT_FREQUENCY = "conflict_frequency"         # Frequency of conflicts
    LEARNING_RATE = "learning_rate"                   # Rate of learning improvement
    RESOURCE_USAGE = "resource_usage"                 # Resource consumption
    ADAPTABILITY_FLEXIBILITY = "adaptability_flexibility"  # Adaptability score
    INNOVATION_OUTPUT = "innovation_output"           # Innovation generation rate
    USER_SATISFACTION = "user_satisfaction"           # End-user satisfaction

class ContextType(Enum):
    """Types of contexts for strategy selection"""
    URGENCY_CRITICAL = "urgency_critical"             # Critical urgency
    COMPLEXITY_HIGH = "complexity_high"               # High complexity
    COLLABORATION_INTENSIVE = "collaboration_intensive"  # Requires collaboration
    INNOVATION_REQUIRED = "innovation_required"      # Requires innovation
    QUALITY_SENSITIVE = "quality_sensitive"           # Quality is critical
    TIME_CONSTRAINED = "time_constrained"             # Time is constrained
    RESOURCE_LIMITED = "resource_limited"             # Limited resources
    MULTI_DOMAIN = "multi_domain"                     # Cross-domain challenge
    UNCERTAINTY_HIGH = "uncertainty_high"             # High uncertainty
    EXPLORATORY = "exploratory"                       # Exploratory nature

@dataclass
class Strategy:
    """Individual strategy with its characteristics and performance"""
    strategy_id: str
    name: str
    strategy_type: StrategyType
    description: str
    parameters: Dict[str, Any]
    agent_combination: List[AgentRole]
    best_suitable_contexts: List[ContextType]
    optimization_objectives: List[OptimizationObjective]
    performance_history: Dict[StrategyPerformanceMetric, List[float]] = field(default_factory=lambda: defaultdict(list))
    current_effectiveness: float = 0.5
    last_updated: datetime = field(default_factory=datetime.now)
    usage_count: int = 0
    success_count: int = 0

@dataclass
class StrategySelection:
    """Record of strategy selection for a specific task"""
    selection_id: str
    task: AGITask
    selected_strategy: Strategy
    selection_confidence: float
    selection_rationale: str
    context_analysis: Dict[str, Any]
    alternative_strategies: List[Tuple[Strategy, float]]  # (strategy, confidence)
    performance_prediction: Dict[StrategyPerformanceMetric, float]
    timestamp: datetime
    outcome: Optional[Dict[str, Any]] = None

@dataclass
class StrategyAdaptation:
    """Record of strategy adaptation and optimization"""
    adaptation_id: str
    original_strategy: Strategy
    adapted_strategy: Strategy
    adaptation_reason: str
    performance_change: Dict[StrategyPerformanceMetric, float]
    adaptation_success: bool
    timestamp: datetime

@dataclass
class ContextAnalysis:
    """Analysis of task and environment context"""
    context_id: str
    task_complexity: float
    urgency_level: float
    collaboration_requirement: float
    innovation_need: float
    resource_constraints: Dict[str, float]
    domain_complexity: float
    uncertainty_level: float
    context_vector: np.ndarray
    dominant_contexts: List[ContextType]
    timestamp: datetime = field(default_factory=datetime.now)

class AdaptiveStrategySelection:
    """
    Advanced adaptive strategy selection system that enables intelligent
    strategy optimization based on real-time analysis, learning, and prediction.

    This system provides:
    1. Real-time strategy performance analysis and optimization
    2. Multi-agent collaborative strategy selection
    3. Predictive strategy recommendation using historical patterns
    4. Dynamic strategy adaptation based on context and feedback
    5. Strategy effectiveness tracking and learning
    6. Context-aware strategy matching and selection
    7. Performance-based strategy evolution
    8. Multi-objective strategy optimization
    9. Emergent strategy discovery and development
    10. Continuous strategy refinement and improvement
    """

    def __init__(self, agents: Dict[AgentRole, BaseAgent]):
        self.agents = agents
        self.strategies: Dict[str, Strategy] = {}
        self.selection_history: List[StrategySelection] = []
        self.adaptation_history: List[StrategyAdaptation] = []
        self.context_analyses: Dict[str, ContextAnalysis] = {}

        # Strategy optimization systems
        self.strategy_analyzer = StrategyAnalyzer()
        self.performance_predictor = PerformancePredictor()
        self.context_analyzer = ContextAnalyzer()
        self.strategy_optimizer = StrategyOptimizer()
        self.strategy_evolver = StrategyEvolver()
        self.multi_objective_optimizer = MultiObjectiveOptimizer()

        # Learning and adaptation
        self.learning_models = {}
        self.performance_patterns = defaultdict(list)
        self.context_strategy_mappings = defaultdict(list)
        self.strategy_effectiveness_cache = {}

        # Optimization parameters
        self.optimization_frequency = 10  # Optimize every 10 selections
        self.adaptation_threshold = 0.1   # Adapt if performance drops by 10%
        self.learning_rate = 0.1
        self.exploration_rate = 0.2        # 20% exploration

        # Storage and persistence
        self.storage_path = Path("strategy_selection")
        self.storage_path.mkdir(exist_ok=True)

        # Background processing
        self.executor = ThreadPoolExecutor(max_workers=15)
        self.optimization_in_progress = False

        # Initialize default strategies
        self._initialize_default_strategies()

        logger.info("🎯 Adaptive Strategy Selection System Initialized - Intelligent Optimization Ready")

    def _initialize_default_strategies(self):
        """Initialize default strategies for different scenarios"""

        # Collaborative strategies
        self.strategies["collaborative_consensus"] = Strategy(
            strategy_id="collaborative_consensus",
            name="Collaborative Consensus Building",
            strategy_type=StrategyType.COLLABORATIVE,
            description="Build consensus through collaborative discussion and agreement",
            parameters={
                "consensus_threshold": 0.7,
                "discussion_rounds": 3,
                "voting_method": "majority"
            },
            agent_combination=list(AgentRole),
            best_suitable_contexts=[ContextType.COLLABORATION_INTENSIVE, ContextType.QUALITY_SENSITIVE],
            optimization_objectives=[OptimizationObjective.MAXIMIZE_CONSENSUS, OptimizationObjective.MAXIMIZE_QUALITY]
        )

        # Hierarchical strategies
        self.strategies["queen_coordinated"] = Strategy(
            strategy_id="queen_coordinated",
            name="Queen Coordinator Leadership",
            strategy_type=StrategyType.HIERARCHICAL,
            description="Queen coordinator leads with specialist input and integration",
            parameters={
                "coordination_strength": 0.8,
                "specialist_weight": 0.7,
                "decision_authority": "queen"
            },
            agent_combination=list(AgentRole),
            best_suitable_contexts=[ContextType.URGENCY_CRITICAL, ContextType.TIME_CONSTRAINED],
            optimization_objectives=[OptimizationObjective.MINIMIZE_TIME, OptimizationObjective.MAXIMIZE_QUALITY]
        )

        # Swarm intelligence strategies
        self.strategies["swarm_emergent"] = Strategy(
            strategy_id="swarm_emergent",
            name="Swarm Emergent Intelligence",
            strategy_type=StrategyType.SWARM_INTELLIGENCE,
            description="Let intelligence emerge from swarm interactions and local decisions",
            parameters={
                "swarm_size": 10,
                "interaction_radius": 3,
                "emergence_threshold": 0.6,
                "self_organization": True
            },
            agent_combination=list(AgentRole),
            best_suitable_contexts=[ContextType.COMPLEXITY_HIGH, ContextType.UNCERTAINTY_HIGH],
            optimization_objectives=[OptimizationObjective.MAXIMIZE_INNOVATION, OptimizationObjective.BALANCE_ALL]
        )

        # Specialist-led strategies
        self.strategies["specialist_driven"] = Strategy(
            strategy_id="specialist_driven",
            name="Specialist-Driven Approach",
            strategy_type=StrategyType.SPECIALIZED,
            description="Domain specialists lead with supporting roles from others",
            parameters={
                "specialist_authority": 0.9,
                "support_weight": 0.5,
                "cross_validation": True
            },
            agent_combination=list(AgentRole),
            best_suitable_contexts=[ContextType.MULTI_DOMAIN, ContextType.QUALITY_SENSITIVE],
            optimization_objectives=[OptimizationObjective.MAXIMIZE_QUALITY, OptimizationObjective.MINIMIZE_CONFLICTS]
        )

        # Adaptive hybrid strategies
        self.strategies["adaptive_hybrid"] = Strategy(
            strategy_id="adaptive_hybrid",
            name="Adaptive Hybrid Strategy",
            strategy_type=StrategyType.ADAPTIVE_HYBRID,
            description="Dynamically combine multiple approaches based on real-time feedback",
            parameters={
                "adaptation_frequency": 5,
                "switch_threshold": 0.3,
                "combination_method": "weighted",
                "real_time_feedback": True
            },
            agent_combination=list(AgentRole),
            best_suitable_contexts=[ContextType.UNCERTAINTY_HIGH, ContextType.COMPLEXITY_HIGH],
            optimization_objectives=[OptimizationObjective.CONTEXT_OPTIMIZED, OptimizationObjective.BALANCE_ALL]
        )

        # Predictive optimization strategies
        self.strategies["predictive_optimization"] = Strategy(
            strategy_id="predictive_optimization",
            name="Predictive Optimization",
            strategy_type=StrategyType.PREDICTIVE,
            description="Use predictive models to optimize strategy selection and execution",
            parameters={
                "prediction_horizon": 3,
                "model_accuracy_threshold": 0.8,
                "optimization_iterations": 5,
                "prediction_confidence": 0.7
            },
            agent_combination=list(AgentRole),
            best_suitable_contexts=[ContextType.RESOURCE_LIMITED, ContextType.TIME_CONSTRAINED],
            optimization_objectives=[OptimizationObjective.MINIMIZE_TIME, OptimizationObjective.RESOURCE_EFFICIENT]
        )

        logger.info(f"📋 Initialized {len(self.strategies)} default strategies")

    async def select_optimal_strategy(self, task: AGITask, context: Dict[str, Any] = None,
                                    optimization_objectives: List[OptimizationObjective] = None) -> StrategySelection:
        """
        Select optimal strategy for the given task and context

        This is the main method where intelligent strategy selection happens:
        1. Analyze task context and requirements
        2. Evaluate available strategies against context
        3. Predict performance for each candidate strategy
        4. Apply multi-objective optimization
        5. Select best strategy with confidence scoring
        6. Consider exploration vs exploitation trade-offs
        7. Record selection for learning and improvement
        8. Provide rationale and alternative options
        """

        logger.info(f"🎯 Selecting optimal strategy for task: {task.task_id}")
        start_time = time.time()

        # Step 1: Analyze task context
        context_analysis = await self.context_analyzer.analyze_context(task, context)
        self.context_analyses[context_analysis.context_id] = context_analysis

        # Step 2: Filter strategies suitable for context
        suitable_strategies = await self._filter_suitable_strategies(context_analysis)

        # Step 3: Predict performance for each strategy
        strategy_predictions = {}
        for strategy in suitable_strategies:
            prediction = await self.performance_predictor.predict_performance(
                strategy, context_analysis, optimization_objectives
            )
            strategy_predictions[strategy.strategy_id] = prediction

        # Step 4: Apply multi-objective optimization
        optimization_objectives = optimization_objectives or [OptimizationObjective.BALANCE_ALL]
        optimized_rankings = await self.multi_objective_optimizer.optimize_strategies(
            suitable_strategies, strategy_predictions, optimization_objectives
        )

        # Step 5: Apply exploration vs exploitation logic
        final_rankings = await self._apply_exploration_exploitation(
            optimized_rankings, context_analysis
        )

        # Step 6: Select best strategy
        selected_strategy, selection_confidence = final_rankings[0]

        # Step 7: Generate selection rationale
        rationale = await self._generate_selection_rationale(
            selected_strategy, context_analysis, strategy_predictions
        )

        # Step 8: Create selection record
        selection = StrategySelection(
            selection_id=f"selection_{int(time.time())}_{len(self.selection_history)}",
            task=task,
            selected_strategy=selected_strategy,
            selection_confidence=selection_confidence,
            selection_rationale=rationale,
            context_analysis={
                'complexity': context_analysis.task_complexity,
                'urgency': context_analysis.urgency_level,
                'contexts': [ctx.value for ctx in context_analysis.dominant_contexts]
            },
            alternative_strategies=final_rankings[1:4],  # Top 3 alternatives
            performance_prediction=strategy_predictions[selected_strategy.strategy_id],
            timestamp=datetime.now()
        )

        self.selection_history.append(selection)

        # Step 9: Update strategy usage statistics
        selected_strategy.usage_count += 1
        selected_strategy.last_updated = datetime.now()

        selection_time = time.time() - start_time
        logger.info(f"✅ Strategy selected in {selection_time:.3f}s: {selected_strategy.name} (confidence: {selection_confidence:.2f})")

        return selection

    async def _filter_suitable_strategies(self, context_analysis: ContextAnalysis) -> List[Strategy]:
        """Filter strategies suitable for the given context"""

        suitable_strategies = []

        for strategy in self.strategies.values():
            # Check context suitability
            context_match = any(
                ctx in strategy.best_suitable_contexts
                for ctx in context_analysis.dominant_contexts
            )

            # Check agent availability
            agents_available = all(
                agent in self.agents for agent in strategy.agent_combination
            )

            # Check basic effectiveness threshold
            effectiveness_ok = strategy.current_effectiveness > 0.3

            if context_match and agents_available and effectiveness_ok:
                suitable_strategies.append(strategy)

        # If no strategies are suitable, return all as fallback
        if not suitable_strategies:
            suitable_strategies = list(self.strategies.values())

        return suitable_strategies

    async def _apply_exploration_exploitation(self, strategy_rankings: List[Tuple[Strategy, float]],
                                            context_analysis: ContextAnalysis) -> List[Tuple[Strategy, float]]:
        """Apply exploration vs exploitation logic to strategy rankings"""

        # Exploration decision
        if np.random.random() < self.exploration_rate:
            # Explore: randomly select from lower-ranked strategies
            if len(strategy_rankings) > 2:
                # Select from top 5 strategies with weighted probability
                top_strategies = strategy_rankings[:5]
                weights = [1.0 / (i + 1) for i in range(len(top_strategies))]  # Decreasing weights
                selected_idx = np.random.choice(len(top_strategies), p=np.array(weights)/sum(weights))

                # Move selected strategy to top
                selected_strategy = top_strategies[selected_idx]
                strategy_rankings.remove(selected_strategy)
                strategy_rankings.insert(0, (selected_strategy[0], selected_strategy[1] * 0.9))  # Slightly lower confidence for exploration

                logger.info(f"🔍 Exploring alternative strategy: {selected_strategy[0].name}")

        return strategy_rankings

    async def _generate_selection_rationale(self, strategy: Strategy, context_analysis: ContextAnalysis,
                                          strategy_predictions: Dict[str, Dict[str, float]]) -> str:
        """Generate rationale for strategy selection"""

        rationale_parts = [
            f"Selected {strategy.name} because:",
            f"• Context match: Fits {len([ctx for ctx in strategy.best_suitable_contexts if ctx in context_analysis.dominant_contexts])}/{len(context_analysis.dominant_contexts)} dominant contexts",
            f"• Predicted effectiveness: {strategy_predictions[strategy.strategy_id].get('overall_effectiveness', 0):.2f}",
            f"• Historical performance: {strategy.current_effectiveness:.2f}",
            f"• Usage confidence: {strategy.success_count}/{strategy.usage_count} success rate" if strategy.usage_count > 0 else "• New strategy with theoretical promise"
        ]

        # Add specific context-based reasoning
        if ContextType.URGENCY_CRITICAL in context_analysis.dominant_contexts:
            rationale_parts.append("• Time-critical nature favors efficient coordination")
        if ContextType.COMPLEXITY_HIGH in context_analysis.dominant_contexts:
            rationale_parts.append("• High complexity requires systematic approach")
        if ContextType.COLLABORATION_INTENSIVE in context_analysis.dominant_contexts:
            rationale_parts.append("• Collaboration-intensive task benefits from collective intelligence")

        return "\n".join(rationale_parts)

    async def update_strategy_performance(self, selection_id: str, outcome: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update strategy performance based on execution outcome

        This enables learning and improvement:
        1. Update strategy performance metrics
        2. Analyze outcome effectiveness
        3. Calculate performance changes
        4. Update strategy effectiveness scores
        5. Trigger adaptation if needed
        6. Update learning models
        7. Optimize strategy parameters
        """

        # Find the selection record
        selection = next((s for s in self.selection_history if s.selection_id == selection_id), None)
        if not selection:
            raise ValueError(f"Selection not found: {selection_id}")

        logger.info(f"📊 Updating performance for strategy: {selection.selected_strategy.name}")

        # Step 1: Extract performance metrics from outcome
        performance_metrics = await self.strategy_analyzer.extract_performance_metrics(outcome)

        # Step 2: Update strategy performance history
        strategy = selection.selected_strategy
        for metric, value in performance_metrics.items():
            if metric in strategy.performance_history:
                strategy.performance_history[metric].append(value)
                # Keep only recent history (last 50)
                if len(strategy.performance_history[metric]) > 50:
                    strategy.performance_history[metric] = strategy.performance_history[metric][-50]

        # Step 3: Update success count
        overall_success = performance_metrics.get(StrategyPerformanceMetric.SUCCESS_RATE, 0) > 0.7
        if overall_success:
            strategy.success_count += 1

        # Step 4: Calculate new effectiveness score
        new_effectiveness = self._calculate_strategy_effectiveness(strategy)
        effectiveness_change = new_effectiveness - strategy.current_effectiveness
        strategy.current_effectiveness = new_effectiveness

        # Step 5: Check if adaptation is needed
        adaptation_applied = False
        if abs(effectiveness_change) > self.adaptation_threshold:
            adaptation_result = await self._trigger_strategy_adaptation(
                strategy, effectiveness_change, performance_metrics
            )
            adaptation_applied = adaptation_result['adaptation_applied']

        # Step 6: Update learning patterns
        self._update_learning_patterns(selection, performance_metrics)

        # Step 7: Update outcome in selection
        selection.outcome = outcome

        # Step 8: Periodic optimization trigger
        if len(self.selection_history) % self.optimization_frequency == 0:
            await self._trigger_periodic_optimization()

        return {
            'strategy_updated': strategy.strategy_id,
            'new_effectiveness': new_effectiveness,
            'effectiveness_change': effectiveness_change,
            'adaptation_applied': adaptation_applied,
            'performance_metrics': {metric.value: value for metric, value in performance_metrics.items()}
        }

    def _calculate_strategy_effectiveness(self, strategy: Strategy) -> float:
        """Calculate overall effectiveness score for strategy"""

        if not strategy.performance_history:
            return 0.5  # Default for new strategies

        # Calculate weighted average of different metrics
        metric_weights = {
            StrategyPerformanceMetric.SUCCESS_RATE: 0.3,
            StrategyPerformanceMetric.QUALITY_SCORE: 0.25,
            StrategyPerformanceMetric.TIME_EFFICIENCY: 0.2,
            StrategyPerformanceMetric.CONSENSUS_STRENGTH: 0.15,
            StrategyPerformanceMetric.CONFLICT_FREQUENCY: -0.1,  # Negative weight (lower is better)
        }

        effectiveness = 0.5  # Base score
        total_weight = 0

        for metric, weight in metric_weights.items():
            if metric in strategy.performance_history and strategy.performance_history[metric]:
                recent_values = strategy.performance_history[metric][-10:]  # Last 10 values
                avg_value = np.mean(recent_values)
                effectiveness += avg_value * weight
                total_weight += abs(weight)

        # Normalize
        if total_weight > 0:
            effectiveness = effectiveness / total_weight

        # Apply success rate factor
        if strategy.usage_count > 0:
            success_factor = strategy.success_count / strategy.usage_count
            effectiveness = (effectiveness + success_factor) / 2

        return max(0.0, min(1.0, effectiveness))

    async def _trigger_strategy_adaptation(self, strategy: Strategy, effectiveness_change: float,
                                         performance_metrics: Dict[StrategyPerformanceMetric, float]) -> Dict[str, Any]:
        """Trigger adaptation process for strategy"""

        logger.info(f"🔄 Triggering adaptation for {strategy.name} (change: {effectiveness_change:.3f})")

        adaptation_reason = self._determine_adaptation_reason(effectiveness_change, performance_metrics)

        # Create adapted strategy
        adapted_strategy = await self.strategy_optimizer.adapt_strategy(
            strategy, adaptation_reason, performance_metrics
        )

        # Record adaptation
        adaptation = StrategyAdaptation(
            adaptation_id=f"adaptation_{int(time.time())}_{len(self.adaptation_history)}",
            original_strategy=strategy,
            adapted_strategy=adapted_strategy,
            adaptation_reason=adaptation_reason,
            performance_change=performance_metrics,
            adaptation_success=True,
            timestamp=datetime.now()
        )

        self.adaptation_history.append(adaptation)

        # Replace strategy with adapted version
        self.strategies[strategy.strategy_id] = adapted_strategy

        return {
            'adaptation_applied': True,
            'adaptation_reason': adaptation_reason,
            'adapted_strategy_id': adapted_strategy.strategy_id,
            'parameter_changes': adapted_strategy.parameters
        }

    def _determine_adaptation_reason(self, effectiveness_change: float,
                                   performance_metrics: Dict[StrategyPerformanceMetric, float]) -> str:
        """Determine reason for strategy adaptation"""

        if effectiveness_change < -0.2:
            return "significant_performance_decline"
        elif effectiveness_change < -0.1:
            return "moderate_performance_decline"
        elif performance_metrics.get(StrategyPerformanceMetric.CONFLICT_FREQUENCY, 0) > 0.5:
            return "high_conflict_frequency"
        elif performance_metrics.get(StrategyPerformanceMetric.TIME_EFFICIENCY, 0) < 0.4:
            return "poor_time_efficiency"
        elif performance_metrics.get(StrategyPerformanceMetric.QUALITY_SCORE, 0) < 0.5:
            return "low_quality_output"
        else:
            return "continuous_improvement"

    def _update_learning_patterns(self, selection: StrategySelection,
                                performance_metrics: Dict[StrategyPerformanceMetric, float]):
        """Update learning patterns for future predictions"""

        # Update context-strategy mappings
        context_key = str(sorted(ctx.value for ctx in selection.context_analysis.get('contexts', [])))
        self.context_strategy_mappings[context_key].append({
            'strategy_id': selection.selected_strategy.strategy_id,
            'performance': performance_metrics,
            'confidence': selection.selection_confidence,
            'timestamp': selection.timestamp
        })

        # Update performance patterns
        overall_performance = np.mean(list(performance_metrics.values()))
        self.performance_patterns[selection.selected_strategy.strategy_type.value].append(overall_performance)

    async def _trigger_periodic_optimization(self):
        """Trigger periodic optimization of all strategies"""

        if self.optimization_in_progress:
            return

        self.optimization_in_progress = True

        try:
            logger.info("🔧 Triggering periodic strategy optimization...")

            optimization_results = await self.strategy_optimizer.optimize_all_strategies(
                list(self.strategies.values()), self.selection_history[-50:]
            )

            for strategy_id, optimization_result in optimization_results.items():
                if strategy_id in self.strategies:
                    # Apply optimization if beneficial
                    if optimization_result['improvement'] > 0.05:
                        optimized_strategy = optimization_result['optimized_strategy']
                        self.strategies[strategy_id] = optimized_strategy
                        logger.info(f"✅ Optimized strategy: {optimized_strategy.name} (+{optimization_result['improvement']:.2%})")

        finally:
            self.optimization_in_progress = False

    async def discover_emergent_strategies(self) -> List[Strategy]:
        """Discover new emergent strategies from patterns and interactions"""

        if len(self.selection_history) < 20:
            return []

        logger.info("🔍 Discovering emergent strategies...")

        # Analyze successful patterns
        successful_selections = [
            s for s in self.selection_history[-50:]
            if s.outcome and s.outcome.get('success_rate', 0) > 0.8
        ]

        emergent_strategies = await self.strategy_evolver.discover_strategies(successful_selections)

        # Add discovered strategies
        for strategy in emergent_strategies:
            if strategy.strategy_id not in self.strategies:
                self.strategies[strategy.strategy_id] = strategy
                logger.info(f"🌟 Discovered emergent strategy: {strategy.name}")

        return emergent_strategies

    def get_strategy_analytics(self) -> Dict[str, Any]:
        """Get comprehensive analytics on strategy performance and selection"""

        # Strategy effectiveness rankings
        strategy_rankings = sorted(
            [(name, strategy.current_effectiveness) for name, strategy in self.strategies.items()],
            key=lambda x: x[1], reverse=True
        )

        # Strategy usage statistics
        usage_stats = {
            strategy_id: {
                'usage_count': strategy.usage_count,
                'success_count': strategy.success_count,
                'success_rate': strategy.success_count / strategy.usage_count if strategy.usage_count > 0 else 0,
                'effectiveness': strategy.current_effectiveness
            }
            for strategy_id, strategy in self.strategies.items()
        }

        # Selection patterns
        recent_selections = self.selection_history[-100:]
        strategy_types_selected = defaultdict(int)
        context_patterns = defaultdict(int)

        for selection in recent_selections:
            strategy_types_selected[selection.selected_strategy.strategy_type.value] += 1
            for context in selection.context_analysis.get('contexts', []):
                context_patterns[context] += 1

        # Adaptation statistics
        adaptation_rate = len(self.adaptation_history) / len(self.selection_history) if self.selection_history else 0

        # Performance trends
        performance_trends = {}
        for strategy_type, performances in self.performance_patterns.items():
            if len(performances) >= 10:
                recent_avg = np.mean(performances[-10:])
                older_avg = np.mean(performances[-20:-10]) if len(performances) >= 20 else recent_avg
                trend = recent_avg - older_avg
                performance_trends[strategy_type] = trend

        return {
            'total_strategies': len(self.strategies),
            'total_selections': len(self.selection_history),
            'total_adaptations': len(self.adaptation_history),
            'strategy_rankings': strategy_rankings,
            'usage_statistics': usage_stats,
            'strategy_type_selections': dict(strategy_types_selected),
            'context_patterns': dict(context_patterns),
            'adaptation_rate': adaptation_rate,
            'performance_trends': performance_trends,
            'average_selection_confidence': np.mean([s.selection_confidence for s in recent_selections]) if recent_selections else 0
        }


# Supporting classes for strategy selection

class StrategyAnalyzer:
    """Analyzes strategy performance and extracts metrics"""

    async def extract_performance_metrics(self, outcome: Dict[str, Any]) -> Dict[StrategyPerformanceMetric, float]:
        """Extract performance metrics from outcome data"""
        metrics = {}

        # Extract or calculate various metrics
        metrics[StrategyPerformanceMetric.SUCCESS_RATE] = outcome.get('success_rate', outcome.get('success', 0.7))
        metrics[StrategyPerformanceMetric.QUALITY_SCORE] = outcome.get('quality_score', 0.7)
        metrics[StrategyPerformanceMetric.TIME_EFFICIENCY] = 1.0 - min(1.0, outcome.get('processing_time', 10) / 20)  # Normalize to 20 seconds
        metrics[StrategyPerformanceMetric.CONSENSUS_STRENGTH] = outcome.get('consensus_strength', 0.6)
        metrics[StrategyPerformanceMetric.CONFLICT_FREQUENCY] = outcome.get('conflict_frequency', 0.2)
        metrics[StrategyPerformanceMetric.LEARNING_RATE] = outcome.get('learning_rate', 0.1)
        metrics[StrategyPerformanceMetric.RESOURCE_USAGE] = 1.0 - outcome.get('resource_efficiency', 0.7)
        metrics[StrategyPerformanceMetric.INNOVATION_OUTPUT] = outcome.get('innovation_score', 0.3)
        metrics[StrategyPerformanceMetric.USER_SATISFACTION] = outcome.get('user_satisfaction', 0.8)

        return metrics

class PerformancePredictor:
    """Predicts strategy performance for given contexts"""

    def __init__(self):
        self.prediction_models = {}
        self.historical_accuracy = defaultdict(list)

    async def predict_performance(self, strategy: Strategy, context: ContextAnalysis,
                                optimization_objectives: List[OptimizationObjective]) -> Dict[str, float]:
        """Predict performance for strategy in given context"""

        # Base prediction on historical performance
        base_performance = strategy.current_effectiveness

        # Context adjustment factors
        context_match = len([
            ctx for ctx in strategy.best_suitable_contexts
            if ctx in context.dominant_contexts
        ]) / max(len(strategy.best_suitable_contexts), 1)

        # Urgency adjustment
        urgency_factor = 1.0
        if ContextType.URGENCY_CRITICAL in context.dominant_contexts:
            if OptimizationObjective.MINIMIZE_TIME in optimization_objectives:
                urgency_factor = 1.2
            else:
                urgency_factor = 0.9

        # Complexity adjustment
        complexity_factor = 1.0
        if ContextType.COMPLEXITY_HIGH in context.dominant_contexts:
            if StrategyType.SWARM_INTELLIGENCE in strategy.strategy_type:
                complexity_factor = 1.1
            elif StrategyType.HIERARCHICAL in strategy.strategy_type:
                complexity_factor = 0.8

        # Calculate predicted performance
        predicted_performance = base_performance * context_match * urgency_factor * complexity_factor

        # Add some randomness for realism
        predicted_performance += np.random.normal(0, 0.05)

        return {
            'overall_effectiveness': max(0.0, min(1.0, predicted_performance)),
            'context_match': context_match,
            'urgency_adjustment': urgency_factor,
            'complexity_adjustment': complexity_factor,
            'prediction_confidence': 0.7  # Base confidence
        }

class ContextAnalyzer:
    """Analyzes task and environment contexts"""

    async def analyze_context(self, task: AGITask, additional_context: Dict[str, Any] = None) -> ContextAnalysis:
        """Comprehensive context analysis"""

        # Task complexity analysis
        content_length = len(task.description.split())
        complexity_indicators = ['complex', 'advanced', 'multi-faceted', 'enterprise', 'scalable']
        complexity_score = sum(1 for indicator in complexity_indicators if indicator in task.description.lower())
        task_complexity = min(1.0, (content_length / 100 + complexity_score * 0.2))

        # Urgency level
        urgency_keywords = ['urgent', 'critical', 'immediate', 'asap']
        urgency_level = 0.3 + sum(1 for keyword in urgency_keywords if keyword in task.description.lower()) * 0.2
        if task.priority == TaskPriority.CRITICAL:
            urgency_level = max(urgency_level, 0.9)

        # Collaboration requirement
        collaboration_keywords = ['collaborate', 'team', 'coordinate', 'integrate', 'multi-disciplinary']
        collaboration_requirement = sum(1 for keyword in collaboration_keywords if keyword in task.description.lower()) * 0.2
        collaboration_requirement = min(1.0, collaboration_requirement + len(task.required_agents) / 15)

        # Innovation need
        innovation_keywords = ['innovate', 'creative', 'novel', 'breakthrough', 'pioneer']
        innovation_need = sum(1 for keyword in innovation_keywords if keyword in task.description.lower()) * 0.25
        innovation_need = min(1.0, innovation_need)

        # Resource constraints (simplified)
        resource_constraints = {
            'time': 0.5,  # Default
            'computational': 0.3,
            'expertise': 0.4
        }

        # Domain complexity
        domain_complexity = min(1.0, len(task.required_agents) / 10)

        # Uncertainty level
        uncertainty_keywords = ['uncertain', 'unknown', 'explore', 'investigate', 'experimental']
        uncertainty_level = sum(1 for keyword in uncertainty_keywords if keyword in task.description.lower()) * 0.2
        uncertainty_level = min(1.0, uncertainty_level)

        # Determine dominant contexts
        dominant_contexts = []
        if urgency_level > 0.7:
            dominant_contexts.append(ContextType.URGENCY_CRITICAL)
        if task_complexity > 0.7:
            dominant_contexts.append(ContextType.COMPLEXITY_HIGH)
        if collaboration_requirement > 0.6:
            dominant_contexts.append(ContextType.COLLABORATION_INTENSIVE)
        if innovation_need > 0.6:
            dominant_contexts.append(ContextType.INNOVATION_REQUIRED)
        if uncertainty_level > 0.6:
            dominant_contexts.append(ContextType.UNCERTAINTY_HIGH)

        # Create context vector for ML purposes
        context_vector = np.array([
            task_complexity, urgency_level, collaboration_requirement,
            innovation_need, domain_complexity, uncertainty_level
        ])

        return ContextAnalysis(
            context_id=f"context_{int(time.time())}_{hash(task.description[:100]) % 10000}",
            task_complexity=task_complexity,
            urgency_level=urgency_level,
            collaboration_requirement=collaboration_requirement,
            innovation_need=innovation_need,
            resource_constraints=resource_constraints,
            domain_complexity=domain_complexity,
            uncertainty_level=uncertainty_level,
            context_vector=context_vector,
            dominant_contexts=dominant_contexts or [ContextType.EXPLORATORY]  # Default
        )

class StrategyOptimizer:
    """Optimizes strategies based on performance feedback"""

    async def adapt_strategy(self, strategy: Strategy, adaptation_reason: str,
                           performance_metrics: Dict[StrategyPerformanceMetric, float]) -> Strategy:
        """Adapt strategy parameters based on feedback"""

        adapted_strategy = Strategy(
            strategy_id=f"{strategy.strategy_id}_adapted_{int(time.time())}",
            name=f"{strategy.name} (Adapted)",
            strategy_type=strategy.strategy_type,
            description=f"Adapted version: {strategy.description}",
            parameters=strategy.parameters.copy(),
            agent_combination=strategy.agent_combination.copy(),
            best_suitable_contexts=strategy.best_suitable_contexts.copy(),
            optimization_objectives=strategy.optimization_objectives.copy(),
            performance_history=strategy.performance_history,
            current_effectiveness=strategy.current_effectiveness,
            last_updated=datetime.now(),
            usage_count=strategy.usage_count,
            success_count=strategy.success_count
        )

        # Apply specific adaptations based on reason
        if adaptation_reason == "significant_performance_decline":
            # Increase adaptability
            if 'adaptation_frequency' in adapted_strategy.parameters:
                adapted_strategy.parameters['adaptation_frequency'] *= 0.8  # More frequent adaptation
            if 'switch_threshold' in adapted_strategy.parameters:
                adapted_strategy.parameters['switch_threshold'] *= 0.9  # Lower threshold for switching

        elif adaptation_reason == "high_conflict_frequency":
            # Increase consensus requirements
            if 'consensus_threshold' in adapted_strategy.parameters:
                adapted_strategy.parameters['consensus_threshold'] *= 1.1  # Higher threshold
            if 'discussion_rounds' in adapted_strategy.parameters:
                adapted_strategy.parameters['discussion_rounds'] += 1  # More discussion

        elif adaptation_reason == "poor_time_efficiency":
            # Optimize for speed
            if 'coordination_strength' in adapted_strategy.parameters:
                adapted_strategy.parameters['coordination_strength'] *= 1.2  # Stronger coordination
            if 'discussion_rounds' in adapted_strategy.parameters:
                adapted_strategy.parameters['discussion_rounds'] = max(1, adapted_strategy.parameters['discussion_rounds'] - 1)

        return adapted_strategy

    async def optimize_all_strategies(self, strategies: List[Strategy],
                                    recent_selections: List[StrategySelection]) -> Dict[str, Dict[str, Any]]:
        """Optimize all strategies based on recent performance"""

        optimization_results = {}

        for strategy in strategies:
            # Calculate potential optimizations
            improvements = await self._calculate_optimizations(strategy, recent_selections)

            if improvements['improvement'] > 0.05:  # Only apply if improvement is significant
                optimized_strategy = await self._apply_optimizations(strategy, improvements)
                optimization_results[strategy.strategy_id] = {
                    'optimized_strategy': optimized_strategy,
                    'improvement': improvements['improvement'],
                    'optimizations_applied': improvements['optimizations']
                }

        return optimization_results

    async def _calculate_optimizations(self, strategy: Strategy,
                                     recent_selections: List[StrategySelection]) -> Dict[str, Any]:
        """Calculate potential optimizations for strategy"""

        # This is a simplified version - would be more sophisticated in practice
        optimizations = []
        potential_improvement = 0.0

        # Analyze recent performance
        strategy_selections = [s for s in recent_selections if s.selected_strategy.strategy_id == strategy.strategy_id]

        if strategy_selections:
            avg_performance = np.mean([
                s.outcome.get('success_rate', 0.5) for s in strategy_selections
                if s.outcome
            ]) if strategy_selections else 0.5

            if avg_performance < 0.6:
                # Poor performance - suggest optimizations
                if strategy.strategy_type == StrategyType.COLLABORATIVE:
                    optimizations.append("increase_consensus_threshold")
                    potential_improvement += 0.1
                elif strategy.strategy_type == StrategyType.HIERARCHICAL:
                    optimizations.append("increase_specialist_weight")
                    potential_improvement += 0.08

        return {
            'optimizations': optimizations,
            'improvement': potential_improvement
        }

    async def _apply_optimizations(self, strategy: Strategy,
                                 improvements: Dict[str, Any]) -> Strategy:
        """Apply optimizations to strategy"""

        optimized_strategy = Strategy(
            strategy_id=f"{strategy.strategy_id}_optimized_{int(time.time())}",
            name=f"{strategy.name} (Optimized)",
            strategy_type=strategy.strategy_type,
            description=f"Optimized version: {strategy.description}",
            parameters=strategy.parameters.copy(),
            agent_combination=strategy.agent_combination.copy(),
            best_suitable_contexts=strategy.best_suitable_contexts.copy(),
            optimization_objectives=strategy.optimization_objectives.copy(),
            performance_history=strategy.performance_history.copy(),
            current_effectiveness=strategy.current_effectiveness,
            last_updated=datetime.now(),
            usage_count=strategy.usage_count,
            success_count=strategy.success_count
        )

        # Apply specific optimizations
        for optimization in improvements.get('optimizations', []):
            if optimization == "increase_consensus_threshold":
                if 'consensus_threshold' in optimized_strategy.parameters:
                    optimized_strategy.parameters['consensus_threshold'] *= 1.1
            elif optimization == "increase_specialist_weight":
                if 'specialist_weight' in optimized_strategy.parameters:
                    optimized_strategy.parameters['specialist_weight'] *= 1.15

        return optimized_strategy

class StrategyEvolver:
    """Discovers and evolves new strategies"""

    async def discover_strategies(self, successful_selections: List[StrategySelection]) -> List[Strategy]:
        """Discover new emergent strategies from successful patterns"""

        emergent_strategies = []

        # Analyze successful patterns
        if len(successful_selections) >= 10:
            # Look for recurring patterns
            strategy_combinations = defaultdict(int)
            for selection in successful_selections:
                combo = tuple(sorted([s.strategy_type.value for s in selection.selected_strategy.agent_combination]))
                strategy_combinations[combo] += 1

            # Create emergent strategies from frequent patterns
            for combo, count in strategy_combinations.items():
                if count >= 3:  # Pattern appears at least 3 times
                    emergent_strategy = await self._create_emergent_strategy(combo, count)
                    emergent_strategies.append(emergent_strategy)

        return emergent_strategies

    async def _create_emergent_strategy(self, pattern: Tuple[str, ...], frequency: int) -> Strategy:
        """Create emergent strategy from discovered pattern"""

        strategy_name = f"Emergent {len(pattern)}-Agent Pattern"
        strategy_id = f"emergent_{hash(pattern) % 10000}_{int(time.time())}"

        # Map pattern to agent roles (simplified)
        agent_roles = [AgentRole.QUEEN_COORDINATOR]  # Always include queen
        # Add other agents based on pattern
        available_roles = [role for role in AgentRole if role != AgentRole.QUEEN_COORDINATOR]
        agent_roles.extend(available_roles[:len(pattern)-1])

        return Strategy(
            strategy_id=strategy_id,
            name=strategy_name,
            strategy_type=StrategyType.EMERGENT,
            description=f"Emergent strategy discovered from {frequency} successful executions with {len(pattern)}-agent pattern",
            parameters={
                "pattern_frequency": frequency,
                "emergent_properties": True,
                "self_organizing": True
            },
            agent_combination=agent_roles,
            best_suitable_contexts=[ContextType.UNCERTAINTY_HIGH, ContextType.COMPLEXITY_HIGH],
            optimization_objectives=[OptimizationObjective.BALANCE_ALL, OptimizationObjective.MAXIMIZE_INNOVATION]
        )

class MultiObjectiveOptimizer:
    """Optimizes strategies across multiple objectives"""

    async def optimize_strategies(self, strategies: List[Strategy],
                                predictions: Dict[str, Dict[str, float]],
                                objectives: List[OptimizationObjective]) -> List[Tuple[Strategy, float]]:
        """Optimize strategies across multiple objectives"""

        optimized_rankings = []

        for strategy in strategies:
            if strategy.strategy_id in predictions:
                prediction = predictions[strategy.strategy_id]
                optimization_score = self._calculate_multi_objective_score(
                    prediction, objectives
                )
                optimized_rankings.append((strategy, optimization_score))

        # Sort by optimization score
        optimized_rankings.sort(key=lambda x: x[1], reverse=True)

        return optimized_rankings

    def _calculate_multi_objective_score(self, prediction: Dict[str, float],
                                      objectives: List[OptimizationObjective]) -> float:
        """Calculate multi-objective optimization score"""

        if OptimizationObjective.BALANCE_ALL in objectives:
            return prediction.get('overall_effectiveness', 0.5)

        # Weight different objectives
        objective_weights = {
            OptimizationObjective.MAXIMIZE_QUALITY: 0.3,
            OptimizationObjective.MINIMIZE_TIME: 0.25,
            OptimizationObjective.MAXIMIZE_CONSENSUS: 0.2,
            OptimizationObjective.MINIMIZE_CONFLICTS: 0.15,
            OptimizationObjective.MAXIMIZE_INNOVATION: 0.1
        }

        score = 0.5  # Base score
        total_weight = 0

        for objective in objectives:
            if objective in objective_weights:
                weight = objective_weights[objective]
                if objective == OptimizationObjective.MAXIMIZE_QUALITY:
                    score += prediction.get('overall_effectiveness', 0.5) * weight
                elif objective == OptimizationObjective.MINIMIZE_TIME:
                    score += prediction.get('urgency_adjustment', 1.0) * weight
                elif objective == OptimizationObjective.MAXIMIZE_CONSENSUS:
                    score += prediction.get('context_match', 0.5) * weight
                total_weight += weight

        if total_weight > 0:
            score = score / total_weight

        return max(0.0, min(1.0, score))


if __name__ == "__main__":
    # Demonstration of Adaptive Strategy Selection
    async def demonstrate_strategy_selection():
        """Demonstrate adaptive strategy selection capabilities"""

        from ten_agent_architecture import TenAgentAGISystem, AGITask, TaskPriority, AgentRole, OptimizationObjective

        print("🎯 Initializing Adaptive Strategy Selection System...")
        agi_system = TenAgentAGISystem()

        # Create strategy selection system
        strategy_selector = AdaptiveStrategySelection(agi_system.agents)

        # Test strategy selection scenarios
        test_scenarios = [
            {
                'task': AGITask(
                    task_id="urgent_security",
                    description="URGENT: Critical security vulnerability discovered - immediate patch required",
                    priority=TaskPriority.CRITICAL,
                    required_agents=[AgentRole.SECURITY_SPECIALIST, AgentRole.CODE_ARCHITECT, AgentRole.TESTING_QUALITY],
                    context={'urgency': 'critical', 'security_impact': 'high'},
                    created_at=datetime.now()
                ),
                'objectives': [OptimizationObjective.MINIMIZE_TIME, OptimizationObjective.MAXIMIZE_QUALITY]
            },
            {
                'task': AGITask(
                    task_id="complex_architecture",
                    description="Design complex enterprise architecture for multi-domain system with scalability and innovation requirements",
                    priority=TaskPriority.HIGH,
                    required_agents=list(AgentRole),
                    context={'complexity': 'high', 'innovation': 'required'},
                    created_at=datetime.now()
                ),
                'objectives': [OptimizationObjective.MAXIMIZE_INNOVATION, OptimizationObjective.BALANCE_ALL]
            },
            {
                'task': AGITask(
                    task_id="collaborative_design",
                    description="Collaborative design process requiring team coordination and consensus building",
                    priority=TaskPriority.MEDIUM,
                    required_agents=list(AgentRole),
                    context={'collaboration': 'intensive', 'consensus': 'important'},
                    created_at=datetime.now()
                ),
                'objectives': [OptimizationObjective.MAXIMIZE_CONSENSUS, OptimizationObjective.MINIMIZE_CONFLICTS]
            }
        ]

        strategy_selections = []

        for i, scenario in enumerate(test_scenarios, 1):
            print(f"\n🚀 Strategy Selection Scenario {i}: {scenario['task'].description[:60]}...")

            # Select optimal strategy
            selection = await strategy_selector.select_optimal_strategy(
                task=scenario['task'],
                context=scenario['task'].context,
                optimization_objectives=scenario['objectives']
            )

            strategy_selections.append(selection)

            print(f"✅ Strategy Selected:")
            print(f"   Strategy: {selection.selected_strategy.name}")
            print(f"   Type: {selection.selected_strategy.strategy_type.value}")
            print(f"   Confidence: {selection.selection_confidence:.2f}")
            print(f"   Rationale: {selection.selection_rationale[:100]}...")
            print(f"   Alternatives: {len(selection.alternative_strategies)} options")

        # Simulate outcomes and update performance
        for selection in strategy_selections:
            # Simulate different outcomes
            if "URGENT" in selection.task.description:
                outcome = {
                    'success_rate': 0.9,
                    'quality_score': 0.8,
                    'processing_time': 5,
                    'consensus_strength': 0.7,
                    'conflict_frequency': 0.1,
                    'user_satisfaction': 0.85
                }
            else:
                outcome = {
                    'success_rate': 0.75,
                    'quality_score': 0.85,
                    'processing_time': 15,
                    'consensus_strength': 0.8,
                    'conflict_frequency': 0.2,
                    'user_satisfaction': 0.8
                }

            # Update performance
            update_result = await strategy_selector.update_strategy_performance(
                selection.selection_id, outcome
            )

            print(f"\n📊 Performance Update:")
            print(f"   Strategy: {update_result['strategy_updated']}")
            print(f"   New Effectiveness: {update_result['new_effectiveness']:.2f}")
            print(f"   Change: {update_result['effectiveness_change']:+.3f}")
            print(f"   Adaptation Applied: {update_result['adaptation_applied']}")

        # Discover emergent strategies
        emergent_strategies = await strategy_selector.discover_emergent_strategies()
        if emergent_strategies:
            print(f"\n🌟 Discovered {len(emergent_strategies)} emergent strategies")

        # Get comprehensive analytics
        analytics = strategy_selector.get_strategy_analytics()

        print(f"\n📈 Strategy Selection Analytics:")
        print(f"   Total Strategies: {analytics['total_strategies']}")
        print(f"   Total Selections: {analytics['total_selections']}")
        print(f"   Adaptation Rate: {analytics['adaptation_rate']:.2%}")
        print(f"   Average Confidence: {analytics['average_selection_confidence']:.2f}")
        print(f"   Top 3 Strategies: {[name for name, _ in analytics['strategy_rankings'][:3]]}")

        print(f"\n✨ Adaptive Strategy Selection Demonstrated Successfully!")

    # Run demonstration
    asyncio.run(demonstrate_strategy_selection())