# Game update workflow

For every user request to update the game:

1. Implement the requested changes and verify the affected gameplay.
2. Add a dated entry to `CHANGELOG.md` describing the change. Update `README.md` when player instructions or project setup change.
3. Commit the game changes and documentation together with a descriptive message. Keep unrelated working tree changes out of the commit.
4. Push the commit to this repository's GitHub remote and verify that the remote branch contains it. Report the commit and any push blocker to the user.
