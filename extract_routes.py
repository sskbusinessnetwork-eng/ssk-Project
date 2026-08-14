import re
import os

with open("server.ts", "r") as f:
    content = f.read()

# We can manually write the routes by grabbing the blocks or we can just copy them.
# I'll just write a quick script to generate these API files since they share similar imports.

