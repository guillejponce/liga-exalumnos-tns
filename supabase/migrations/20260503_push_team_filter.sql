alter table push_subscriptions add column team_id uuid references teams(id) on delete set null;
