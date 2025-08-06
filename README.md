# Technifold Sales System

A comprehensive B2B e-commerce platform for Technifold Ltd, specializing in print finishing equipment and consumables.

## Features

- **Product Catalog**: Browse 1,644 products categorized as Tools, Consumables, and Parts
- **Machine Compatibility Search**: Cascading dropdown system to find compatible tools by manufacturer and machine detail
- **Individual Product Pages**: Detailed product information with compatible consumables
- **Customer Portal**: Personalized links for customers to reorder consumables for their specific tools
- **Admin Interface**: Manage tool-consumable compatibility relationships
- **Data Import System**: Scripts to import and validate product data from CSV files

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Project Structure

```
technifold-sales/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin pages
│   ├── api/               # API routes
│   ├── customer-portal/   # Customer portal pages
│   ├── machines/          # Machine-specific tool pages
│   └── tools/             # Individual tool pages
├── components/            # Reusable React components
├── lib/                   # Utility libraries
├── scripts/              # Data import and validation scripts
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. **Run the development server**:
```bash
npm run dev
```

## Database Schema

The system uses 8 main tables:
- `products` - All products (Tools, Consumables, Parts)
- `customers` - Customer information
- `customer_tool` - Links customers to their tools
- `tool_consumable_compatibility` - Compatibility matrix
- `tool_manufacturer_details` - Machine compatibility data
- `orders` - Order records
- `order_items` - Order line items
- `customer_links` - Secure customer portal tokens

## Data Management Scripts

- `scripts/import-with-parts.js` - Import products with 3-category classification
- `scripts/validate-all-data.js` - Comprehensive data validation
- `scripts/add-compatibility.js` - Add tool-consumable relationships
- `scripts/setup-database.js` - Initial database setup

## Product Categories

- **Tools (426)**: Tri-creasers, Fast-Fit tools, perforators, etc.
- **Consumables (866)**: Moulds, blades, rubbers, sleeves (wear items)
- **Parts (352)**: Screws, holders, components

## Deployment

The application is designed for deployment on Vercel with Supabase as the backend.

## License

Proprietary - Technifold Ltd

## Support

For technical support, contact the development team.