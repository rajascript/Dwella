# Dwella - Tenant Management System

A modern web application for managing properties and tenants, built with React and Firebase.

## Features

- 🔐 Secure Authentication
- 🏠 Property Management
- 👥 Tenant Management
- 💰 Rent Tracking
- 📊 Activity Monitoring
- 📱 Responsive Design
- 🔔 WhatsApp & SMS Notifications

## Tech Stack

- **Frontend**: React.js
- **Styling**: Tailwind CSS
- **Backend**: Firebase
  - Firestore Database
  - Firebase Authentication
  - Firebase Hosting
- **UI Components**: Heroicons
- **Routing**: React Router

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/dwella.git
cd dwella
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory and add your Firebase configuration:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

4. Start the development server:

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
dwella/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── utils/
│   ├── App.js
│   └── index.js
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
└── package.json
```

## Features in Detail

### Property Management

- Add and manage multiple properties
- Track property details and status
- View property-specific tenant information

### Tenant Management

- Add new tenants with detailed information
- Track tenant status and history
- Manage tenant documents and agreements

### Rent Tracking

- Automatic monthly rent generation
- Payment tracking and history
- Due date notifications

### Activity Monitoring

- Track all tenant-related activities
- View payment history
- Monitor maintenance requests

### Notifications

- WhatsApp integration for tenant communication
- SMS notifications for important updates
- Customizable notification templates

## Deployment

1. Build the application:

```bash
npm run build
```

2. Deploy to Firebase:

```bash
firebase deploy
```

## Security

The application implements robust security measures:

- Firebase Authentication for user management
- Firestore Security Rules for data access control
- Secure API key management
- Protected routes and components

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@dwella.com or create an issue in the repository.

## Acknowledgments

- Firebase for the backend infrastructure
- React team for the frontend framework
- Tailwind CSS for the styling system
