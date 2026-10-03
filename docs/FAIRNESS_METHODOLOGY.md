# FAIR DROP — FAIRNESS METHODOLOGY & MATHEMATICAL FRAMEWORK

## 1. Core Allocation Philosophy

Fair Drop rejects First-Come, First-Served (FCFS) for high-demand drops because FCFS creates an arms race where sub-millisecond bots, co-located servers, and request flooding gain an overwhelming advantage over human users.

Fair Drop replaces speed wars with:
1. **Time-Insensitive Entry Window**: Users have several minutes to enter. Arriving at T=0.001s has the exact same odds as arriving at T=179s.
2. **Commit-Reveal Randomness**: The server commits `hash(seed)` before the window opens. After the window closes, the seed is revealed so anyone can verify the draw.
3. **Deterministic Fisher-Yates Draw**: Seats are awarded according to the seeded shuffle.

---

## 2. Mathematical Metrics & Formulas

### A. Jain's Fairness Index
Measures whether allocation chances are uniformly distributed across user classes:
$$J(x) = \frac{(\sum_{i=1}^{n} x_i)^2}{n \sum_{i=1}^{n} x_i^2}$$
- In an ideal fair system, $J = 1.0$.
- In traditional FCFS under bot attacks, $J < 0.45$.

### B. Gini Coefficient
Quantifies inequality of allocation probability across different user groups (0 = perfect equality, 1 = total monopoly).

### C. Bot Advantage Ratio ($BAR$)
$$\text{Bot Advantage Ratio} = \frac{\text{Bot Win Rate}}{\text{Human Win Rate}} = \frac{\text{Bot Winners} / \text{Bot Attempts}}{\text{Human Winners} / \text{Human Attempts}}$$
- **Ideal Fair Drop Outcome**: $\approx 1.00$ (bots have no advantage over humans).
- **Typical FCFS Outcome**: $\ge 12.50\times$ (bots capture almost all limited seats).

---

## 3. Honest Sybil Attack Analysis

**Critical Honesty Rule**: Uniform random draws eliminate speed and flood advantages, but **cannot eliminate Sybil attacks** (where one operator controls 50 distinct verified phone numbers or accounts).
- The Adversarial Lab explicitly measures this limitation.
- If a bot operator brings 15 accounts to a 500-seat drop, their probability of winning scales with their account count.
- Fair Drop documents this transparently in the Fairness Report rather than falsely claiming "100% invulnerability".
