# Wrota Review Console

Upload these files to the root of your GitHub Pages repository:

- index.html
- styles.css
- app.js
- .nojekyll
- 404.html

The interface uses the built-in proxy and only asks for the API key inside the browser session.


## Browser-save API key field

This build keeps the API key as a normal password-manager-compatible field:

```html
autocomplete="current-password"
name="lzt_api_key"
```

Browsers/password managers can offer to save and autofill the API key for this site.
The key is not hardcoded into the public website files.
