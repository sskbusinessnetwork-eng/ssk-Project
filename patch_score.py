import re

def patch_score():
    with open('src/utils/growthScore.ts', 'r') as f:
        content = f.read()

    # In calculateMemberGrowthScoreData
    # Change todayScore and max_score calculations

    old_formula = """  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.isDone).length;
  
  // Daily Score Formula: Today's Score = Math.round((completed_tasks / total_tasks) * 100)
  const todayScore = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;"""

    new_formula = """  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.isDone).length;
  
  // Calculate total score based on points earned across all tasks
  const rawScore = tasks.reduce((acc, t) => acc + (t.isDone ? (t.pointsVal || 0) : 0), 0);
  const todayScore = Math.round(rawScore);
  
  // Calculate max possible score based on date range
  const today = new Date();
  today.setHours(0,0,0,0);
  const start = input.activeDateRange?.start ? new Date(input.activeDateRange.start) : new Date(today);
  start.setHours(0,0,0,0);
  const end = input.activeDateRange?.end ? new Date(input.activeDateRange.end) : new Date(today);
  end.setHours(23,59,59,999);
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const maxPossible = diffDays * 100;"""
  
    content = content.replace(old_formula, new_formula)

    # Now replace the return statement to use maxPossible
    # scoreText: `${todayScore} / 100` -> scoreText: `${todayScore} / ${maxPossible}`
    
    content = content.replace("scoreText: `${todayScore} / 100`", "scoreText: `${todayScore} / ${maxPossible}`")
    content = content.replace("daily_max_score: 100,", "daily_max_score: maxPossible,")
    content = content.replace("maxPossible: totalTasksCount,", "maxPossible: maxPossible,")

    # Now do the same for chapter score calculation:
    old_chapter = """  const avgCompleted = membersWithData.reduce((acc, d) => acc + d.completed_tasks, 0) / chapterMembersCount;
  const avgTotal = membersWithData.reduce((acc, d) => acc + d.total_tasks, 0) / chapterMembersCount;
  
  const score = avgTotal > 0 ? Math.round((avgCompleted / avgTotal) * 100) : 0;"""

    new_chapter = """  const score = Math.round(membersWithData.reduce((acc, d) => acc + d.score, 0) / chapterMembersCount);
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const start = input.activeDateRange?.start ? new Date(input.activeDateRange.start) : new Date(today);
  start.setHours(0,0,0,0);
  const end = input.activeDateRange?.end ? new Date(input.activeDateRange.end) : new Date(today);
  end.setHours(23,59,59,999);
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const maxPossible = diffDays * 100;"""

    content = content.replace(old_chapter, new_chapter)
    
    content = content.replace("scoreText: `${score} / 100`", "scoreText: `${score} / ${maxPossible}`")
    content = content.replace("maxPossible: 100", "maxPossible: maxPossible")

    with open('src/utils/growthScore.ts', 'w') as f:
        f.write(content)

patch_score()
