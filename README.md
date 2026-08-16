# Veterinary Web Site Frontend

This is the frontend for a veterinary web application, built with HTML, CSS, and JavaScript. It provides user authentication (login and registration) and connects to a backend API for data operations.

## Project Structure

```
veterinary_web_site_frontend2/
├── index.html                  # Landing page (login/registration form)
├── dashboard.html              # User dashboard after login
├── server.js                   # Simple Express server for serving static files (development)
├── package.json                # Node.js dependencies and scripts
└── components/
    └── registerLogin/          # Login and registration components
        ├── registerLogin.html  # HTML for login/register forms
        ├── registerLogin.js    # JavaScript for form handling and API calls
        └── style.css           # Styles for the login/register forms
```

## Features

- **User Login**: Existing users can sign in with email and password.
- **User Registration**: New users can create an account with name, email, password, and terms acceptance.
- **Authentication Flow**: Uses JWT tokens stored in `localStorage` for session management.
- **Responsive Design**: Works on mobile and desktop devices.
- **Form Validation**: Client-side validation for email, password strength, and required fields.
- **UI Feedback**: Success and error messages for form submissions.

## Authentication Flow

### 1. Login Process
1. User enters email and password in the login form.
2. On form submission, `registerLogin.js`:
   - Validates the email format.
   - Sends a POST request to `API_BASE_URL + "/auth/login"` with `{ email, password }`.
   - On success:
     - Saves the JWT token and user data to `localStorage`.
     - Redirects to `dashboard.html`.
   - On error: Displays an error message in the form.

### 2. Registration Process
1. User fills in first name, last name, email, password, confirms password, and accepts terms.
2. On form submission, `registerLogin.js`:
   - Validates email format.
   - Checks that passwords match.
   - Validates password strength (minimum 8 characters).
   - Sends a POST request to `API_BASE_URL + "/auth/register"` with `{ firstName, lastName, email, password }`.
   - On success:
     - Saves the JWT token and user data to `localStorage`.
     - Redirects to `dashboard.html`.
   - On error: Displays an error message in the form.

### 3. Session Management
- Upon successful login or registration, the backend returns a JWT token.
- The token is stored in `localStorage` under the keys `token` and `authToken`.
- The user object (if provided) is stored as a JSON string in `localStorage` under `user`.
- On subsequent visits, the application can check `localStorage` for a token to determine if the user is logged in.

## Backend Connection

The frontend communicates with a backend API running separately. The base URL for API requests is defined in `components/registerLogin/registerLogin.js`:

```javascript
const API_BASE_URL = "http://localhost:8080/api";
```

### API Endpoints Used
- **POST `/auth/login`**: Authenticates user credentials and returns a JWT token.
- **POST `/auth/register`**: Registers a new user and returns a JWT token.

> **Note**: The backend must be running and accessible at the specified `API_BASE_URL` for the frontend to function correctly. The frontend does not include backend logic; it assumes a compatible API is available.

## Running the Project Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- A running backend API on `http://localhost:8080` (or update `API_BASE_URL` in `registerLogin.js` to match your backend URL)

### Steps
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
   This runs `server.js` on `http://localhost:3000` by default.
4. Open your browser and navigate to `http://localhost:3000`.

### Available Scripts (in package.json)
- `npm start`: Starts the Express server on port 3000.
- `npm test`: (Placeholder) For running tests.
- `npm run dev`: (Placeholder) For development with live reload.

## Deployment to GitHub Pages

GitHub Pages serves static files only, so we cannot run the Node.js server (`server.js`) there. However, the frontend (HTML, CSS, JS) can be hosted on GitHub Pages, and the backend must be deployed separately.

### Steps for GitHub Pages Deployment
1. **Deploy the Backend**: Ensure your backend API is deployed and accessible via a public URL (e.g., on Heroku, Render, AWS, etc.).
2. **Update API Base URL**: In `components/registerLogin/registerLogin.js`, change `API_BASE_URL` to your deployed backend's URL.
   ```javascript
   // Example for a backend deployed on Heroku
   const API_BASE_URL = "https://your-backend-app.herokuapp.com/api";
   ```
   > **Important**: Make sure your backend is configured to accept requests from your GitHub Pages domain (CORS settings).
3. **Commit and Push**: Commit your changes to the GitHub repository.
4. **Enable GitHub Pages**:
   - Go to your repository settings on GitHub.
   - Navigate to the "Pages" section.
   - Under "Source", select the `main` (or `master`) branch and the `/ (root)` folder.
   - Click "Save".
5. **Access Your Site**: Your site will be available at `https://<username>.github.io/<repository-name>/`.

### Note on CORS
When deploying to GitHub Pages, your frontend will be served from a domain like `username.github.io`. Your backend must be configured to allow Cross-Origin Resource Sharing (CORS) requests from this domain. Consult your backend framework's documentation for enabling CORS.

## Contributing

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes.
4. Ensure your code follows the existing style.
5. Add tests if applicable.
6. Commit and push your changes.
7. Open a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details (if applicable).

## Acknowledgments

- Design inspiration from various modern UI sources.
- Built with vanilla HTML, CSS, and JavaScript for simplicity and learning purposes.