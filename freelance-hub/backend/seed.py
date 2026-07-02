"""
Seed the Freelance Hub database with rich demo data so that
dashboards, charts, and analytics pages look great on first run.
Run this ONCE after the database is created:
    .\\venv\\Scripts\\python -m backend.seed
"""
import os, sys, sqlite3, datetime, random

# ── locate the project root ─────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from backend.database import DATABASE_PATH, init_db
from backend.utils import hash_password

# ---------------------------------------------------------------------------
CATEGORIES   = ["Web Development", "Mobile Apps", "UI/UX Design",
                 "Content Writing", "Digital Marketing"]
SKILLS_POOL  = ["Python", "Flask", "React", "Node.js", "Django",
                 "Figma", "Photoshop", "Vue.js", "AWS", "PostgreSQL",
                 "SEO", "Copywriting", "Kotlin", "Swift", "TailwindCSS"]

FREELANCERS  = [
    ("Alice Nguyen",       "alice@example.com",    "Python, Flask, PostgreSQL, AWS",
     "Senior Backend Engineer",
     "I specialise in scalable REST APIs and microservices. 8 years experience.",
     4.9),
    ("Bob Martinez",       "bob@example.com",      "React, Vue.js, TailwindCSS, Figma",
     "Full-Stack Frontend Developer",
     "Pixel-perfect UI builder who loves great DX and accessibility.",
     4.7),
    ("Carla Osei",         "carla@example.com",    "Figma, Photoshop, UI/UX Design",
     "Product Designer & Prototyper",
     "I turn complex workflows into intuitive, beautiful interfaces.",
     4.8),
    ("David Kim",          "david@example.com",    "Kotlin, Swift, Firebase, React Native",
     "Mobile App Developer",
     "Cross-platform specialist who ships polished iOS and Android apps.",
     4.6),
    ("Emma Roberts",       "emma@example.com",     "Copywriting, SEO, Content Writing",
     "Content Strategist",
     "Helping brands tell stories that rank and convert.",
     4.5),
]

CLIENTS = [
    ("Tech Startup Ltd",       "startup@example.com",  "Tech Startup Ltd",
     "Fast-moving SaaS startup building the future of HR software."),
    ("Design Agency Co",       "design@example.com",   "Design Agency Co",
     "Award-winning digital agency with clients across 20 countries."),
    ("E-Commerce Giants",      "ecom@example.com",     "E-Commerce Giants",
     "Rapidly scaling marketplace with over 2 M active shoppers."),
]

PROJECTS = [
    ("Build a Django REST API for E-Commerce", "Web Development",
     3500, -45, "Completed",
     "We need a production-grade REST API with JWT auth, Stripe integration and PostgreSQL."),
    ("Redesign Our Mobile Banking App UI", "UI/UX Design",
     2200, -30, "Completed",
     "Figma redesign of 40+ screens for our iOS / Android banking application."),
    ("React Native Cross-Platform App", "Mobile Apps",
     4000, -15, "Completed",
     "Build an MVP shopping app for iOS and Android using React Native + Firebase."),
    ("SEO Content Package (10 Articles)", "Content Writing",
     800, -60, "Completed",
     "Need 10 × 1500-word SEO-optimised articles about fintech and crypto."),
    ("Vue.js SaaS Dashboard", "Web Development",
     2800, -5, "In Progress",
     "Build a responsive analytics dashboard in Vue 3 + Vite with dark/light mode."),
    ("Logo & Brand Identity Kit", "UI/UX Design",
     600, 7, "Open",
     "Create logo, colour palette, typography guide and social-media kit for our brand."),
    ("Marketing Campaign Landing Pages", "Digital Marketing",
     1200, 14, "Open",
     "Build 3 A/B-tested landing pages with SEO metadata and Google Analytics events."),
    ("Python Data-Pipeline Automation", "Web Development",
     1900, 21, "Open",
     "Automate CSV ingestion → cleaning → PostgreSQL load for our BI team."),
]


def run():
    # Re-init schema if needed
    if not os.path.exists(DATABASE_PATH):
        init_db()

    db = sqlite3.connect(DATABASE_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON;")

    # ── check whether seed already ran ──────────────────────────────────────
    row = db.execute("SELECT COUNT(*) AS c FROM users").fetchone()
    if row["c"] > 1:          # admin is auto-created by first server run
        print("Database already seeded – skipping.")
        db.close()
        return

    pwd = hash_password("password123")
    now = datetime.datetime.utcnow()

    # ── Admin ────────────────────────────────────────────────────────────────
    admin_id = db.execute(
        "INSERT INTO users (email, password_hash, role, full_name, created_at)"
        " VALUES (?, ?, 'admin', 'Hub Admin', ?)",
        ("admin@freelancehub.com", pwd, (now - datetime.timedelta(days=120)).isoformat())
    ).lastrowid
    db.execute("INSERT INTO profiles (user_id) VALUES (?)", (admin_id,))

    # ── Freelancers ──────────────────────────────────────────────────────────
    fl_ids = []
    for i, (name, email, skills, title, bio, rating) in enumerate(FREELANCERS):
        created = now - datetime.timedelta(days=90 - i * 12)
        uid = db.execute(
            "INSERT INTO users (email, password_hash, role, full_name, created_at)"
            " VALUES (?, ?, 'freelancer', ?, ?)",
            (email, pwd, name, created.isoformat())
        ).lastrowid
        db.execute(
            "INSERT INTO profiles (user_id, title, bio, skills, rating, rating_count)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (uid, title, bio, skills, rating, random.randint(4, 18))
        )
        fl_ids.append(uid)

    # ── Clients ──────────────────────────────────────────────────────────────
    cl_ids = []
    for i, (name, email, company, bio) in enumerate(CLIENTS):
        created = now - datetime.timedelta(days=85 - i * 10)
        uid = db.execute(
            "INSERT INTO users (email, password_hash, role, full_name, created_at)"
            " VALUES (?, ?, 'client', ?, ?)",
            (email, pwd, name, created.isoformat())
        ).lastrowid
        db.execute(
            "INSERT INTO profiles (user_id, company_name, company_bio)"
            " VALUES (?, ?, ?)",
            (uid, company, bio)
        )
        cl_ids.append(uid)

    db.commit()

    # ── Projects, Contracts, Invoices, Transactions, Reviews ────────────────
    fl_cycle   = 0
    cl_cycle   = 0

    for proj_title, category, budget, day_offset, status, description in PROJECTS:
        created_dt  = now + datetime.timedelta(days=day_offset - 20)
        deadline_dt = now + datetime.timedelta(days=day_offset + 14)
        client_id   = cl_ids[cl_cycle % len(cl_ids)]
        cl_cycle   += 1

        completed_dt = None
        if status == "Completed":
            completed_dt = (now + datetime.timedelta(days=day_offset + 5)).isoformat()

        proj_id = db.execute(
            "INSERT INTO projects (client_id, title, description, category,"
            " budget, deadline, status, created_at, completed_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (client_id, proj_title, description, category,
             budget, deadline_dt.isoformat(), status,
             created_dt.isoformat(), completed_dt)
        ).lastrowid

        if status in ("Completed", "In Progress"):
            fl_id  = fl_ids[fl_cycle % len(fl_ids)]
            fl_cycle += 1
            bid    = round(budget * random.uniform(0.88, 0.97), 2)

            # Application
            db.execute(
                "INSERT INTO applications (project_id, freelancer_id, bid_amount,"
                " cover_letter, status, created_at)"
                " VALUES (?, ?, ?, ?, 'Hired', ?)",
                (proj_id, fl_id, bid,
                 "I have extensive experience with this type of work and can deliver on time.",
                 created_dt.isoformat())
            )

            # Contract
            contract_status = "Completed" if status == "Completed" else "Active"
            contract_id = db.execute(
                "INSERT INTO contracts (project_id, freelancer_id, client_id,"
                " status, budget, paid_amount, created_at, completed_at)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (proj_id, fl_id, client_id, contract_status,
                 bid, bid if status == "Completed" else 0.0,
                 created_dt.isoformat(), completed_dt)
            ).lastrowid

            # Invoice
            inv_status = "Paid" if status == "Completed" else "Pending"
            inv_paid   = completed_dt if status == "Completed" else None
            db.execute(
                "INSERT INTO invoices (contract_id, amount, status, description,"
                " created_at, paid_at)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (contract_id, bid, inv_status,
                 f"Escrow payment for: {proj_title}",
                 created_dt.isoformat(), inv_paid)
            )

            if status == "Completed":
                # Client payment transaction
                db.execute(
                    "INSERT INTO transactions (user_id, amount, type, status,"
                    " description, created_at)"
                    " VALUES (?, ?, 'payment', 'Completed', ?, ?)",
                    (client_id, -bid,
                     f"Escrow payment for '{proj_title}'",
                     completed_dt)
                )
                # Freelancer earning
                db.execute(
                    "INSERT INTO transactions (user_id, amount, type, status,"
                    " description, created_at)"
                    " VALUES (?, ?, 'earning', 'Completed', ?, ?)",
                    (fl_id, bid,
                     f"Earnings for completed project: '{proj_title}'",
                     completed_dt)
                )
                # Notification to freelancer
                db.execute(
                    "INSERT INTO notifications (user_id, type, message, created_at)"
                    " VALUES (?, 'payment', ?, ?)",
                    (fl_id,
                     f"${bid:.2f} credited for completing '{proj_title}'.",
                     completed_dt)
                )
                # Review (client → freelancer)
                rating = random.randint(4, 5)
                db.execute(
                    "INSERT INTO reviews (project_id, reviewer_id, reviewee_id,"
                    " rating, review_text, reviewer_role, created_at)"
                    " VALUES (?, ?, ?, ?, ?, 'client', ?)",
                    (proj_id, client_id, fl_id, rating,
                     "Great communication, delivered on time with high quality.",
                     completed_dt)
                )
                # Update freelancer profile rating
                all_rev = db.execute(
                    "SELECT rating FROM reviews WHERE reviewee_id = ?", (fl_id,)
                ).fetchall()
                avg = sum(r["rating"] for r in all_rev) / len(all_rev)
                db.execute(
                    "UPDATE profiles SET rating = ?, rating_count = ? WHERE user_id = ?",
                    (round(avg, 2), len(all_rev), fl_id)
                )

    # ── A few demo messages ───────────────────────────────────────────────────
    for i in range(min(3, len(fl_ids))):
        db.execute(
            "INSERT INTO messages (sender_id, receiver_id, message_text, created_at)"
            " VALUES (?, ?, ?, ?)",
            (cl_ids[0], fl_ids[i],
             "Hi! We reviewed your profile and would love to discuss the project scope.",
             (now - datetime.timedelta(days=10 - i)).isoformat())
        )
        db.execute(
            "INSERT INTO messages (sender_id, receiver_id, message_text, created_at)"
            " VALUES (?, ?, ?, ?)",
            (fl_ids[i], cl_ids[0],
             "Thanks for reaching out! Happy to discuss further – when are you available?",
             (now - datetime.timedelta(days=9 - i)).isoformat())
        )

    db.commit()
    db.close()
    print("SUCCESS: Database seeded successfully with demo data.")


if __name__ == "__main__":
    run()
