import re
with open('src/utils/growthScore.ts', 'r') as f:
    content = f.read()

old_call = """    const res = calculateMemberGrowthScoreData({
      profile: m,
      allReferrals,
      oneToOnes,
      meetings,
      guestInvitations,
      allSlips,
      testimonials
    });"""

new_call = """    const res = calculateMemberGrowthScoreData({
      profile: m,
      allReferrals,
      oneToOnes,
      meetings,
      guestInvitations,
      allSlips,
      testimonials,
      activeDateRange: input.activeDateRange
    });"""

content = content.replace(old_call, new_call)

# Now check where it calculates max possible in calculateChapterGrowthScoreData
old_score_calc = """  const avgScore = Math.round(totalMemberScores / N);
  const avgAnalysedDays = Math.max(1, Math.round(totalAnalysedDaysSum / N));"""

new_score_calc = """  const avgScore = Math.round(totalMemberScores / N);
  const avgAnalysedDays = Math.max(1, Math.round(totalAnalysedDaysSum / N));
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const start = input.activeDateRange?.start ? new Date(input.activeDateRange.start) : new Date(today);
  start.setHours(0,0,0,0);
  const end = input.activeDateRange?.end ? new Date(input.activeDateRange.end) : new Date(today);
  end.setHours(23,59,59,999);
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const maxPossible = diffDays * 100;"""

content = content.replace(old_score_calc, new_score_calc)

content = content.replace("scoreText: `${avgScore} / 100`", "scoreText: `${avgScore} / ${maxPossible}`")
content = content.replace("maxPossible: 100", "maxPossible: maxPossible")

with open('src/utils/growthScore.ts', 'w') as f:
    f.write(content)
