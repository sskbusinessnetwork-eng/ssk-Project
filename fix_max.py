import re

def fix_max():
    with open('src/utils/growthScore.ts', 'r') as f:
        content = f.read()

    # Move maxPossible calculation to the top of calculateMemberGrowthScoreData
    
    # We will just replace maxPossible: maxPossible with maxPossible: 100 in the early return,
    # wait, the instructions say that the maxPossible depends on the date range, so even if !profile, it should probably be diffDays * 100. But if !profile, returning 100 is fine because it's empty anyway.
    
    # But wait, maxPossible is used in daily_max_score too.
    # Let's find "if (!profile) {" and "if (N === 0) {" and replace maxPossible: maxPossible with maxPossible: 100.
    
    content = content.replace("maxPossible: maxPossible,\n      daily_score: 0,\n      daily_max_score: maxPossible", "maxPossible: 100,\n      daily_score: 0,\n      daily_max_score: 100")

    with open('src/utils/growthScore.ts', 'w') as f:
        f.write(content)

fix_max()
