import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

if 'const [subscriptionRequests,' not in content:
    content = content.replace(
        '  const [oneToOnes, setOneToOnes] = useState<any[]>([]);',
        '  const [oneToOnes, setOneToOnes] = useState<any[]>([]);\n  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);'
    )
    
    # Update subscriptions
    sub_text = "const unsubSlips = databaseService.subscribe<any>('thank_you_slips', [], setAllSlips);"
    if sub_text in content:
        content = content.replace(
            sub_text,
            sub_text + "\n    const unsubSubRequests = databaseService.subscribe<any>('subscription_requests', [], setSubscriptionRequests);"
        )

    # Return unsub
    content = content.replace(
        'unsubSlips();',
        'unsubSlips();\n      unsubSubRequests();'
    )

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
