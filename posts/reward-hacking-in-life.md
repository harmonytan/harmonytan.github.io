---
title: Reward Hacking in Life
date: 2025-11-26
category: Thought
---

Xiaohongshu seems to have a kind of magic. Whenever I pick up my phone, I unconsciously swipe to the last page of the app library and open Xiaohongshu almost by reflex.

This even creates a kind of psychological anxiety. When I return to my dorm after an internship and want to enter a flow state for tasks such as deep reading or writing, my eyes are often pulled toward the phone at the edge of my field of vision. A strong motivation then suddenly appears: I want to pick up the phone and open Xiaohongshu. But after I actually start scrolling, I soon fall into another kind of emptiness and anxiety. My brain becomes blurry and hot. A system like Xiaohongshu can somehow regulate human emotion and perception with surprising force.

I could not tolerate this brain-induced anxiety. The hot air conditioner in the room made it worse, so I decided to go back to the office, hoping that the environment would help. The cold air on the way and the office itself made me briefly calmer. But when I opened my work computer and found that there was apparently nothing to do, I again fell into a state of mental heat and dizziness.

Suddenly, the value function frequently mentioned in [Ilya's talk](https://www.youtube.com/watch?v=aR20FWCCjAs&t=2769s) flashed through my mind. I immediately went back to the dorm, turned on the air conditioner, and started writing. Perhaps this behavior is a form of reward hacking in daily life.

## Reinforcement Learning

The optimization objective of reinforcement learning [1] is:
$$
\arg\max_{\theta}\mathbb{E}_{x \in \pi_{\theta}}[R(x)]
$$
- $\pi_{\theta}$ represents the policy, where $\theta$ represents intelligence or model parameters.
- $x$ is a trajectory sampled from the policy. In reinforcement learning, a more general notation is $\tau=<s_0,a_0,r_0,...,s_t,a_t,r_t>$: a long-horizon sequence of action, state, and reward, including the state $s_t$, action $a_t$, and reward $r_t$ at each timestep $t$.
- $R(.)$ is an estimated long-horizon reward function. A general form can be written as $R(x)=r_0+\gamma \times r_1+...+\gamma^{t}r_t$, where $\gamma$ can be interpreted as a discount factor for future returns.

Two additional terms are useful:
1. $Q(s,a)$: the action-value function, which represents the long-term return obtained by taking action $a$ in state $s$ and then continuing according to policy $\pi$.
2. $V(s)$: the state-value function, which represents the long-term return starting from state $s$ under policy $\pi$.

## Some Prior Assumptions

To model reinforcement learning in the human brain, several prior questions must be considered:
- What is the brain's reward function $R(.)$?
- Is the brain's policy $\pi_{\theta}$ independent of its reward function?

In this model, my initial assumptions are:
- The brain's reward function $R(.)$ is ultimately grounded in feelings produced by chemical signals secreted through human physiological responses. This is an intuitive assumption.
- The brain's policy $\pi_{\theta}$ is independent of the reward function. In other words, the chemical secretion stimulated by the brain and the electrical signals that influence decision-making do not directly interfere with each other.

## A Counterintuitive Observation

Why do I choose to pick up my phone and scroll Xiaohongshu for a while instead of reading deeply, writing, studying, or running experiments?

Based on these two action trajectories, I describe them as:
- $\tau_{Xiaohongshu}=<s_0,a_0,r_0,...>$
- $\tau_{Study}=<s_0,a_0,r_0,...>$

To analyze the problem, I need the following intuitive assumptions:
- Humans have a rational discount factor $\gamma$ for future returns and estimate long-term returns with a standard expected reward function.
- Before a certain timestep $T$, scrolling Xiaohongshu has a higher immediate reward; after $T$, reading has a higher immediate reward:
$$
\begin{cases}
r_{t}^{Xiaohongshu}\ge r_{t}^{Reading}, & t\le T \\
r_{t}^{Xiaohongshu}<r_{t}^{Reading}, & t> T
\end{cases}
$$

Under these assumptions, choosing a reasonable discount factor $\gamma$ can lead to either $R(\tau_{Xiaohongshu})<R(\tau_{Study})$ or $R(\tau_{Xiaohongshu}) \ge R(\tau_{Study})$.

If we ask most people which action has a higher expected return for life, scrolling Xiaohongshu or reading, they would likely choose reading. That is, they would say $R(\tau_{Xiaohongshu})<R(\tau_{Study})$. But in practice, the result is counterintuitive: among people who have experienced both Xiaohongshu and reading, many still choose to scroll Xiaohongshu.

There must be some bias in this model.

## A More Fine-Grained Model

To explore the bias in the model, we can further decompose $r_t$. The process from scrolling Xiaohongshu or deep reading to chemical signals affecting the brain can be simplified as:
$$
Information \rightarrow Brain Compression \rightarrow Chemical Signal \rightarrow Expected Brain Reward \ r
$$
Following this chain, we can decompose the process into:
- The information distribution and total information volume of Xiaohongshu and deep reading: $I_{Xiaohongshu},I_{Reading}$
- The information gain after the brain understands and compresses the input: $Compress(I)\rightarrow IG_{Xiaohongshu},IG_{Reading}$
- How humans secrete chemical signals based on information gain: $Chemistry(IG) \rightarrow c_{Xiaohongshu},c_{Reading}$
- The function that maps brain chemistry into expected reward: $r(c)$

## The Information-Gain Loop

This analytical chain has obvious dependencies, so it is better to start from the first step of the processing pipeline.

Directly modeling information volume $I$ is difficult. I regard it as a subjective concept rather than an objective one, because it depends on the brain. Therefore, I analyze the first two steps together.

I again assume, as a prior, that the chemicals secreted by the brain increase linearly with information gain.

Using Shannon entropy [2], information gain can be defined as:
$$
H(X)=-\sum_x p(x)\log p(x)
$$
$$
IG(X;Y=y)=H(X)-H(X \mid Y=y)
$$
Mathematically, it can be expressed as the KL divergence between two distributions: how much uncertainty decreases after taking an action.

I then make the following assumption:
- $|I_{Xiaohongshu}|=|I_{Reading}|$. The two have the same total information volume but different distributions. This is measured from the perspective of the world as the coordinate system. I assume raw information can be represented as visual input, so the total amount of information per unit time should remain the same. Of course, this ignores touch, taste, and other modalities.

After compression by the brain, however, we may get:
- $IG_{Xiaohongshu}>IG_{Reading}$

This produces more pleasure from scrolling Xiaohongshu and causes many people to choose it. This may be a useful analytical path: the brain compresses different types of information with different efficiency, producing different levels of information gain.

## Reward Hacking

I also assume that chemical signals are converted into the final reward $r(.)$, which seems intuitively reasonable.

But from a social perspective, human goals are not merely the secretion of dopamine in the brain. Humans also pursue wealth, status, contribution, and other social objectives. At least when answering rationally, people often model the reward function $r(.)$ from a social perspective.

This is reward hacking in life. We use the wrong proxy objective $R(.)$ for reinforcement learning, causing the policy to converge toward shortcuts for obtaining reward.

Scrolling Xiaohongshu, watching short videos, gambling, and gacha-style behaviors can generate more information gain and stimulate dopamine secretion. From an animal-instinct perspective, the brain treats dopamine secretion as a proxy objective for reinforcement learning and optimizes for it, eventually forming policies that choose Xiaohongshu, short videos, gambling, and gacha.

When people enter a brief rational state, the brain can indeed define a series of social activities as proxy objectives for reinforcement learning. Unfortunately, this rational state is short-lived, and most people do not take action based on it.


[1]: Wikipedia contributors. (2025, November 24). Reinforcement learning. In Wikipedia, The Free Encyclopedia. Retrieved 12:10, November 27, 2025, from https://en.wikipedia.org/w/index.php?title=Reinforcement_learning&oldid=1323963809
[2]: Wikipedia contributors. (2025, November 17). Entropy (information theory). In Wikipedia, The Free Encyclopedia. Retrieved 12:13, November 27, 2025, from https://en.wikipedia.org/w/index.php?title=Entropy_(information_theory)&oldid=1322644264
