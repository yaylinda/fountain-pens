# Fountain Pen & Ink Manager

A React TypeScript application to help you manage your fountain pens and ink collection. Track which pen is currently inked with which ink, and keep a history of these combinations.

## Features

- **Inventory Management**: Keep track of your fountain pens and inks collections
- **Currently Inked**: Record when you ink up a pen, with which ink, and add notes about the combination
- **Simple Interface**: Easy to use tabbed interface for navigating between different sections
- **Data Persistence**: All data is stored in memory (and could be extended to use local storage for persistence)

## Data Structure

The application manages three main types of data:

1. **Pens**: Information about your fountain pens including brand, model, color, and nib details
2. **Inks**: Information about your inks including brand, collection, and name
3. **Currently Inked**: Records of which pens are inked with which inks, when they were filled, and any notes

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Running the Application

```bash
npm run dev
```

The application will be available at http://localhost:5173 (or another port if 5173 is in use).

## Technologies Used

- React
- TypeScript
- Vite
- Material-UI
- date-fns
- UUID

## Future Improvements

- Add persistent storage with local storage or IndexedDB
- Add ink color visualization
- Add statistics and dashboards (e.g., most used inks, pens)
- Add search and filter functionality
- Add export/import functionality
- Add ink sample tracking and history of pen/ink combinations

## License

MIT
