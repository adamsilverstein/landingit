import type { DashboardItem, MilestoneInfo } from '../types.js';

export interface MilestoneGroup {
  /** null represents the "No Milestone" group */
  milestone: MilestoneInfo | null;
  items: DashboardItem[];
}

/**
 * Group a list of dashboard items by milestone.
 * Issues are grouped by their milestone; PRs and issues without milestones
 * fall into a "No Milestone" group placed at the end.
 */
export function groupByMilestone(items: DashboardItem[]): MilestoneGroup[] {
  const milestoneMap = new Map<string, { info: MilestoneInfo; items: DashboardItem[]; seenRepos: Set<string> }>();
  const noMilestone: DashboardItem[] = [];

  for (const item of items) {
    const ms = item.kind === 'issue' ? item.milestone : null;
    if (ms) {
      const repoKey = `${item.repo.owner}/${item.repo.name}`;
      const existing = milestoneMap.get(ms.title);
      if (existing) {
        existing.items.push(item);
        // Aggregate stats from repos we haven't seen yet for this milestone
        if (!existing.seenRepos.has(repoKey)) {
          existing.info = {
            ...existing.info,
            openIssues: existing.info.openIssues + ms.openIssues,
            closedIssues: existing.info.closedIssues + ms.closedIssues,
            dueOn: existing.info.dueOn && ms.dueOn
              ? (new Date(ms.dueOn) < new Date(existing.info.dueOn) ? ms.dueOn : existing.info.dueOn)
              : existing.info.dueOn || ms.dueOn,
          };
          existing.seenRepos.add(repoKey);
        }
      } else {
        milestoneMap.set(ms.title, { info: { ...ms }, items: [item], seenRepos: new Set([repoKey]) });
      }
    } else {
      noMilestone.push(item);
    }
  }

  // Sort milestone groups: those with due dates first (earliest first), then those without
  const groups: MilestoneGroup[] = [...milestoneMap.values()]
    .sort((a, b) => {
      const aDue = a.info.dueOn;
      const bDue = b.info.dueOn;
      if (aDue && bDue) {
        const diff = new Date(aDue).getTime() - new Date(bDue).getTime();
        return diff !== 0 ? diff : a.info.title.localeCompare(b.info.title);
      }
      if (aDue) return -1;
      if (bDue) return 1;
      return a.info.title.localeCompare(b.info.title);
    })
    .map(({ info, items: groupItems }) => ({ milestone: info, items: groupItems }));

  // Add the "No Milestone" group at the end
  if (noMilestone.length > 0) {
    groups.push({ milestone: null, items: noMilestone });
  }

  return groups;
}
