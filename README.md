# Business AI ERP & CRM System

A comprehensive Enterprise Resource Planning (ERP) and Customer Relationship Management (CRM) system built with modern web technologies, designed to help businesses manage their entire operations efficiently.

## 🚀 Features

### Core Modules

#### 1. **Customer Management**
- Complete customer database with detailed profiles
- Customer categorization and status tracking
- Credit limit and payment terms management
- GST and PAN number tracking
- Address and contact information management
- Customer search and filtering capabilities

#### 2. **Lead Management**
- Lead capture and qualification
- Lead assignment and tracking
- Priority and status management
- Follow-up scheduling
- Lead source tracking
- Conversion tracking

#### 3. **Sales Process**
- **Quotations**: Create and manage professional quotations
- **Orders**: Complete order management with inventory integration
- **Invoices**: Generate and track invoices with GST compliance
- **Payments**: Payment tracking and reconciliation
- **Contracts/AMC**: Manage service contracts and annual maintenance contracts

#### 4. **Inventory Management**
- Multi-location inventory tracking
- SKU-based item management
- Low stock alerts
- Cost and selling price tracking
- Supplier management
- Purchase order processing

#### 5. **Manufacturing**
- Work-in-Process (WIP) tracking
- Job card generation and management
- Material consumption vs BOM analysis
- Production scheduling
- Quality control and rejection tracking
- Manufacturing cost analysis

#### 6. **Purchase Management**
- Supplier database management
- Purchase order creation and tracking
- Supplier performance monitoring
- Payment terms and credit limit tracking

#### 7. **Task Management**
- Task assignment and tracking
- Priority and deadline management
- Task categorization
- Time tracking and reporting
- Team collaboration tools

#### 8. **Employee Activities**
- Daily activity logging
- Performance tracking
- Issue reporting
- Time and effort tracking
- Activity categorization

#### 9. **Support & Service**
- Support ticket management
- Customer service tracking
- Issue resolution workflow
- Service level agreement monitoring

#### 10. **Reports & Analytics**
- Sales performance reports
- Inventory analytics
- Manufacturing efficiency reports
- Customer insights
- Financial reporting
- Dashboard with key metrics

### Technical Features

- **Modern UI/UX**: Clean, responsive design with intuitive navigation
- **Real-time Updates**: Live data synchronization across modules
- **Search & Filter**: Advanced search and filtering capabilities
- **Data Export**: Export functionality for reports and data
- **Multi-user Support**: Role-based access control
- **Mobile Responsive**: Works seamlessly on all devices
- **GST Compliance**: Built-in GST calculation and reporting
- **Audit Trail**: Complete activity logging and tracking

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Shadcn/ui** for UI components
- **React Query** for state management
- **React Hook Form** with Zod validation
- **Wouter** for routing

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Drizzle ORM** for database operations
- **PostgreSQL** for data storage
- **Passport.js** for authentication
- **Zod** for schema validation

### Development Tools
- **ESLint** and **Prettier** for code formatting
- **TypeScript** for type checking
- **Vite** for development server and building

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd business-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/business_ai
   SESSION_SECRET=your-session-secret
   PORT=3000
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`

## 🏗️ Project Structure

```
business-ai/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── index.css      # Global styles
├── server/                # Backend Node.js application
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data storage layer
│   ├── auth.ts           # Authentication logic
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schemas
├── data/                 # JSON data files
└── package.json          # Project dependencies
```

## 🔧 Configuration

### Database Configuration
The system uses PostgreSQL with Drizzle ORM. Update the `DATABASE_URL` in your `.env` file to point to your PostgreSQL instance.

### Authentication
The system uses session-based authentication with Passport.js. Configure the `SESSION_SECRET` in your `.env` file.

### Development vs Production
- **Development**: Uses JSON file storage for easy setup
- **Production**: Uses PostgreSQL database for scalability

## 📊 Key Features in Detail

### Dashboard
- Real-time metrics and KPIs
- Recent activities overview
- Quick action buttons
- Performance charts and graphs

### Customer Management
- **Customer Profiles**: Complete customer information including contact details, business information, and credit terms
- **Search & Filter**: Advanced search by name, company, email, or phone
- **Status Tracking**: Active/inactive customer status management
- **Credit Management**: Credit limit and payment terms tracking

### Sales Pipeline
1. **Lead Capture** → **Qualification** → **Quotation** → **Order** → **Invoice** → **Payment**
2. **Contract Management**: AMC and service contract tracking
3. **Payment Tracking**: Payment status and reconciliation

### Inventory Management
- **Multi-location Support**: Track inventory across multiple warehouses
- **Low Stock Alerts**: Automatic notifications for items below threshold
- **Cost Tracking**: Purchase cost and selling price management
- **Supplier Integration**: Link inventory items to suppliers

### Manufacturing
- **Job Cards**: Create and track manufacturing jobs
- **Material Consumption**: Track actual vs planned material usage
- **Quality Control**: Rejection tracking and analysis
- **Cost Analysis**: Labor, overhead, and total cost tracking

### Reporting
- **Sales Reports**: Revenue, orders, and customer analysis
- **Inventory Reports**: Stock levels, movements, and valuation
- **Manufacturing Reports**: Production efficiency and cost analysis
- **Financial Reports**: P&L, balance sheet, and cash flow

## 🔐 Security Features

- **Authentication**: Session-based user authentication
- **Authorization**: Role-based access control
- **Data Validation**: Input validation using Zod schemas
- **SQL Injection Protection**: Parameterized queries with Drizzle ORM
- **XSS Protection**: Content Security Policy headers

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Performance Optimization

- **Code Splitting**: Lazy loading of components
- **Caching**: React Query for efficient data caching
- **Bundle Optimization**: Vite for fast builds
- **Image Optimization**: Optimized image loading
- **Database Indexing**: Optimized database queries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in the `/docs` folder

## 🔄 Version History

- **v1.0.0**: Initial release with core ERP functionality
- **v1.1.0**: Added manufacturing and inventory modules
- **v1.2.0**: Enhanced reporting and analytics
- **v1.3.0**: Added support ticket and contract management

---

**Built with ❤️ for modern businesses** #   C o r t e x O n e  
 