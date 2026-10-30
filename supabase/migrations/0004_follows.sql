-- Following is public: anyone signed in can see who follows whom (for follower counts).
-- Only you can follow or unfollow on your own behalf (the "own friendships" policy from 0001).
create policy "follows readable" on public.friendships for select to authenticated using (true);
create index if not exists friendships_friend_id on public.friendships (friend_id);
