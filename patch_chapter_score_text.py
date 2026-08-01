with open('src/utils/growthScore.ts', 'r') as f:
    content = f.read()

content = content.replace("scoreText: `${avgScore}%`", "scoreText: `${avgScore} / ${maxPossible}`")

with open('src/utils/growthScore.ts', 'w') as f:
    f.write(content)
