# Running Groundwork locally

## The account to test with

**`hafsah.ops@myground.work`** — password `TestPass123!`.

That is the one to use. It is a platform admin, which since 5 September also
means it is on the Groundwork team's operating system, so it opens `/ops`
without any connecting step.

`PLATFORM_ADMIN_BOOTSTRAP_EMAIL` in `api/.env` is set to it, so a database
rebuilt from scratch promotes it on the first boot after that address has signed
up. The variable never creates an account — it promotes one that exists.

## The other three

Only useful for seeing what somebody who is not you sees, which is most of the
point of a system built on capabilities. Same password.

| | | |
|---|---|---|
| `sahar.test@coamana.com` | Sales and marketing | writes the pipeline, cannot touch objectives |
| `james.test@coamana.com` | Product and tech lead | writes use cases and the roadmap |
| `adam.test@coamana.com` | Contributor | five menu items, not sixteen with locks on twelve |

Roles are not fixed to these people. Change what somebody does on **The team**,
and the seed will not put it back.

## Starting it

```
cd api && npm run start:dev      # http://localhost:3000
cd client && npm run dev         # http://localhost:5173
```

Then `http://localhost:5173/ops`.

## The sample data

A target list called **Sample list DELETE ME** with a few companies, so the
boards are not blank while you are looking at them. Everything in it is made up
and named so you cannot mistake it for real pipeline.

```
psql "$DATABASE_URL" -f api/scripts/wipe-the-sample-data.sql
```

removes exactly that and nothing else.

## Names to keep out of here

Groundwork's test data must not borrow MarketView's customers. Afrimash, Bayer,
NABG and the rest belong to the other system, and a fixture carrying one of them
is how somebody ends up reading a Groundwork board and reasoning about
MarketView's pipeline. Use `Northwind` and `Sample Co` names.
