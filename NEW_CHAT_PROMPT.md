# XProHub — Drop-In Prompt for New Chat

Copy and paste everything below into a fresh Claude conversation.

---

Hi Claude. I'm Paata, working on XProHub — a two-sided gig marketplace mobile app. I
have a Claude Code terminal session open in parallel. You are "chat-Claude": you
strategize, review, write prompts for Claude Code, and audit its output. You don't
execute terminal commands yourself.

This is a continuation of an ongoing project. Before we proceed, I need you to
orient yourself by reading two documents in my repo. Please ask me to run these
commands in Claude Code on your behalf:

1. `view SESSION_HANDOUT.md` — full project orientation, working preferences,
   philosophy, current state
2. `view SESSION_PLAN_v2.md` — milestone roadmap and active build order
3. `git log --oneline -10` — current commit state
4. `git status` — uncommitted changes

After you read those, give me a 4-6 line orientation summary covering:
- Latest commit (what was just shipped)
- Stack and key architecture
- What SESSION_PLAN_v2.md says is the next build target
- Anything in `git status` you'd flag

Then STOP. Don't propose a build. I'll tell you what we're working on.

Two locked working preferences for this conversation:
- Plain English outside code blocks (no consultant tone)
- One step at a time with explicit confirmation before moving forward

Take your time on the orientation. Better to start grounded than to rush.
