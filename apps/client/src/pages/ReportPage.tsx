import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FilterItem, SelectFilter } from '@/components/ListToolbar';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, THead, TR, TH } from '@/components/ui/table';
import { api, toApiError } from '@/lib/api';
import type { PayrollReport } from '@/lib/types';
import { formatDate, formatNumber, MONTHS } from '@/lib/utils';
import { useLookups } from '@/stores/lookups';

/** Ведомость начислений сотрудникам: часы × ставка категории, итоги по предприятиям и общий итог */
export default function ReportPage() {
  const companies = useLookups((l) => l.companies);
  const loadLookups = useLookups((l) => l.load);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [report, setReport] = useState<PayrollReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => void loadLookups(), [loadLookups]);

  useEffect(() => {
    if (!/^\d{4}$/.test(year)) {
      setReport(null);
      setError('Введите год из 4 цифр');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<PayrollReport>('/reports/payroll', { params: { year, month: month || undefined, companyId: companyId || undefined } })
      .then((r) => !cancelled && setReport(r.data))
      .catch((e) => !cancelled && setError(toApiError(e).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [year, month, companyId]);

  const period = month ? `${MONTHS[Number(month) - 1]} ${year} г.` : `${year} год`;

  return (
    <>
      <PageHeader
        title="Ведомость начислений"
        description="Начислено = отработанные часы × ставка категории сотрудника."
        action={
          <Button variant="outline" onClick={() => window.print()} className="no-print">
            <Printer className="h-4 w-4" /> Печать
          </Button>
        }
      />

      <div className="no-print mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
        <FilterItem label="Год" className="w-24">
          <Input inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value)} />
        </FilterItem>
        <FilterItem label="Месяц" className="w-40">
          <SelectFilter label="Месяц" allLabel="Весь год" value={month} onChange={setMonth} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
        </FilterItem>
        <FilterItem label="Предприятие" className="w-56">
          <SelectFilter label="Предприятие" value={companyId} onChange={setCompanyId} options={companies.map((c) => ({ value: String(c.id), label: c.name }))} />
        </FilterItem>
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}

      {report && (
        <div className={`space-y-5 ${loading ? 'opacity-70' : ''}`}>
          <p className="text-sm text-muted-foreground">Период: {period}</p>

          {report.companies.length === 0 && <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">За выбранный период работ нет.</p>}

          {report.companies.map((g) => (
            <section key={g.company.id} className="overflow-hidden rounded-lg border bg-card">
              <h2 className="border-b bg-muted/60 px-3 py-2.5 font-semibold">Предприятие: {g.company.name}</h2>
              <Table>
                <THead>
                  <TR>
                    <TH>Ф.И.О.</TH>
                    <TH>Категория</TH>
                    <TH className="text-right">Ставка за 1 ч, тыс. руб.</TH>
                    <TH>Дата</TH>
                    <TH className="text-right">Часов</TH>
                    <TH className="text-right">Начислено, тыс. руб.</TH>
                  </TR>
                </THead>
                <TBody>
                  {g.rows.map((r) => (
                    <TR key={r.workId}>
                      <TD>{r.employee}</TD>
                      <TD>{r.category}</TD>
                      <TD className="text-right">{formatNumber(r.hourlyRate)}</TD>
                      <TD className="whitespace-nowrap">{formatDate(r.workDate)}</TD>
                      <TD className="text-right">{formatNumber(r.hoursWorked)}</TD>
                      <TD className="text-right">{formatNumber(r.accrued)}</TD>
                    </TR>
                  ))}
                  <TR className="bg-muted/40 font-semibold hover:bg-muted/40">
                    <TD colSpan={4}>Итого по предприятию</TD>
                    <TD className="text-right">{formatNumber(g.totalHours)}</TD>
                    <TD className="text-right">{formatNumber(g.totalAccrued)}</TD>
                  </TR>
                </TBody>
              </Table>
            </section>
          ))}

          {report.companies.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sidebar px-4 py-3 text-white">
              <span className="font-semibold">Итого</span>
              <span className="tnum">
                {formatNumber(report.totalHours)} ч · <strong>{formatNumber(report.totalAccrued)} тыс. руб.</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
