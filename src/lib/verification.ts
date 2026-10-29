/** The verification rules, the same as the Biteboard verification rules doc and the website's Settings. */
/** Monthly price of the Verified plan, shown when the store's own price isn't loaded. */
export const VERIFIED_PRICE = '$10/month';

export const VERIFY_RULES = {
  means: "The badge means Biteboard checked that the account really belongs to the person or brand it names. It isn't a reward for being popular, and it doesn't mean Biteboard approves every recipe or health claim the account posts.",
  sections: [
    { title: 'Biteboard Verified: $10 a month', items: ['Anyone 18 or older with a real account can subscribe for $10 a month.', "Paying doesn't turn the badge on by itself. We still check your photo ID, and the badge appears once you pass.", 'The plan is paid through the App Store or Google Play, and you can cancel any time.', 'If you cancel, the badge goes away when your last paid month ends.', "Breaking the rules removes the badge even if you're paying, and the plan is cancelled."] },
    { title: 'Free verification: you need all of these', items: ['The account is a real person, a registered business or a real brand. No fan, parody or joke accounts.', 'Only one account per person or brand.', 'A profile picture, a name, a bio and at least 5 public posts.', 'Posted at least once in the last 30 days.', 'The owner is 18 or older.', '2-step sign-in is on, and no rule strikes in the last 6 months.'] },
    { title: 'And one of these reasons', items: ['Well-known food creator with 10,000 or more followers on Biteboard or another app', 'Registered dietitian, nutritionist or doctor, with a license number we can check', 'Working chef, restaurant or cooking school', 'Food brand or company posting official recipes', 'Founders and staff of Biteboard'] },
    { title: 'How to apply', items: ['Subscribe to the Verified plan, or pick a free reason, and add proof: a photo ID, a business document, a license number, or links to your other accounts.', 'Biteboard reviews it within 7 days and answers in your Inbox.', "If you're turned down, you can apply again after 30 days.", 'Your proof is only used for the check and is deleted within 30 days. Biteboard will never ask for your password, and the only way to pay is the Verified plan in the app.'] },
    { title: 'Keeping the badge', items: ['No made-up calories or macros.', 'No unsafe weight-loss advice, like eating under 1,200 kcal a day, fasting for days, or diet pills.', 'Label paid posts and free products as an ad or a partnership.', 'No pretending to be someone else, and no selling or lending the account.', 'Changing your name or username sends the badge back for a new review.'] },
    { title: "When it's removed", items: ['One serious break (scams, pretending to be someone, dangerous health advice): the badge is removed right away.', 'Two strikes for other rules in 6 months: the badge is removed.', 'Inactive for 6 months: the badge is removed, and you can apply again any time.', 'Removed for breaking a rule: you can apply again after 6 months.'] },
  ],
  appeal: 'Think it was removed by mistake? Reply to the Inbox message within 30 days.',
};
