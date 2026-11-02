# Lesson 1: run the app and make one change

You do not need to understand every file today. Our first goal is to see your own edit in the browser.

## 1. Understand the two parts

The browser displays the page. The server is a program on your computer that supplies scores and historical results. Both parts must be running for this app to work.

## 2. Start the server

Open a terminal in the project folder and enter:

```sh
node --env-file-if-exists=.env server.mjs
```

Keep that terminal open. Open http://127.0.0.1:3000 in a browser. The score should change automatically every three seconds. This is a fictional demonstration, not a real match.

If Windows says node is not recognised, Node.js must be installed or added to the terminal's path. Tell your coding assistant the exact message before trying unrelated fixes.

## 3. Change a heading

Open public/index.html in a text editor. Find:

```html
<h2>What happened before?</h2>
```

Change just that text:

```html
<h2>My WBBL research</h2>
```

Save the file and refresh the browser. The heading should change. HTML is the language that describes the page's content. h2 marks a section heading.

## 4. Try an analysis

Pause the demo. Uncheck Follow the tracker score. Enter 70 runs, 2 wickets and 10.0 overs, leaving the target blank. The pace projection corresponds to 140+. Exact wicket matching should show 5/7 historical successes. Check Pool all wicket counts to broaden the same score/balls observation: it should show 12/15. Notice how changing the sample changes the frequency.

These are real historical counts, not proof that a current team has the same probability. Do not treat the demo score as a real match or the historical frequency as a betting signal.

## 5. Learn the roles

- HTML: what appears on the page.
- CSS: how the page looks.
- JavaScript: how it behaves and calculates.
- Git: records your changes as local commits.
- GitHub: stores a remote copy of your repository.

Your next lesson can explain one JavaScript function: converting 15.3 overs into 93 legal balls. Make small changes, check them, then commit them.
