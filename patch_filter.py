import re

def update_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Change activeDateRange initialization
    old_init = "const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(null);"
    new_init = """const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: today, end: end };
  });"""
    content = content.replace(old_init, new_init)

    # Change start and end date initializations
    content = content.replace("const [filterStartDate, setFilterStartDate] = useState<string>('');", "const [filterStartDate, setFilterStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);")
    content = content.replace("const [filterEndDate, setFilterEndDate] = useState<string>('');", "const [filterEndDate, setFilterEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);")

    # Change handleClearFilter
    old_clear_start = "setFilterStartDate('');"
    new_clear_start = "setFilterStartDate(new Date().toISOString().split('T')[0]);"
    content = content.replace(old_clear_start, new_clear_start)

    old_clear_end = "setFilterEndDate('');"
    new_clear_end = "setFilterEndDate(new Date().toISOString().split('T')[0]);"
    content = content.replace(old_clear_end, new_clear_end)

    old_clear_range = "setActiveDateRange(null);"
    new_clear_range = """const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    setActiveDateRange({ start: today, end: end });"""
    content = content.replace(old_clear_range, new_clear_range)

    # Change activeDateRange display string checking. Sometimes it uses activeDateRange ? ... : 'Lifetime' or similar.
    # It might say "Filtered" or "Lifetime". Let's not worry unless requested. The instructions just say: default to Today, reset returns to Today.

    with open(filename, 'w') as f:
        f.write(content)

update_file('src/pages/Dashboard.tsx')
update_file('src/pages/MyReport.tsx')
