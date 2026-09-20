import { getCompanies } from "@/lib/queries/companies";
import { CompanyCard } from "@/components/companies/company-card";

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Companies</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Supplier contracts and their compliance documents
      </p>

      {companies.length === 0 ? (
        <p className="mt-4 rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          No companies yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </div>
  );
}
