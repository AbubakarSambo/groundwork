/**
 * Being recorded as the originator creates no entitlement.
 *
 * The entitlement comes from that person's agreement, and where there is no
 * agreement the answer is nothing rather than the default. This is an easy
 * mistake to make in code because the originator field is sitting right there
 * and 40% is a number somebody has said out loud - and the cost of making it is
 * telling somebody they are owed money they never agreed to.
 */
import { originatorShareOf, TECHNOLOGY_REVENUE_MODEL } from './attribution-is-not-entitlement';

const on = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const monthly = (months: string[], amount = 1000) =>
  months.map((m) => ({ amount, paidAt: on(`2026-${m}-01`) }));

const theStandingAgreement = { originatorSharePercent: 40, originatorShareMonths: 6 };

describe('somebody with no agreement', () => {
  it('is owed nothing, however much they originated', () => {
    const result = originatorShareOf(monthly(['01', '02', '03']), null);
    expect(result.originatorShare).toBe(0);
  });

  it('and is told that no agreement is recorded, rather than shown a zero', () => {
    /**
     * "0" reads as "you earned nothing". "No revenue share is recorded in this
     * person's agreement" reads as "somebody has not written down what you
     * agreed". Those are different conversations and only one of them is true.
     */
    expect(originatorShareOf(monthly(['01']), null).says).toMatch(/No revenue share is recorded/);
  });

  it('and an agreement with no percent set is the same as no agreement', () => {
    const result = originatorShareOf(monthly(['01']), {
      originatorSharePercent: null,
      originatorShareMonths: 6,
    });
    expect(result.originatorShare).toBe(0);
    expect(result.says).toMatch(/No revenue share is recorded/);
  });
});

describe('somebody whose agreement gives them the share', () => {
  it('gets it, on cash actually collected', () => {
    const result = originatorShareOf(monthly(['01', '02', '03']), theStandingAgreement);
    expect(result.eligibleCash).toBe(3000);
    expect(result.originatorShare).toBe(1200);
  });

  it('and only for the months the agreement covers', () => {
    /* Nine payments, six-month window: three fall outside. */
    const result = originatorShareOf(
      monthly(['01', '02', '03', '04', '05', '06', '07', '08', '09']),
      theStandingAgreement,
    );
    expect(result.eligibleCash).toBe(6000);
    expect(result.originatorShare).toBe(2400);
  });

  it('and reads money as money, in the sentence that justifies the figure', () => {
    const result = originatorShareOf(monthly(['01', '02']), theStandingAgreement);
    expect(result.says).toContain('$2,000');
    expect(result.says).not.toMatch(/of 2000/);
  });

  it('and the sentence says which payments were left out, so the figure can be checked', () => {
    const result = originatorShareOf(
      monthly(['01', '02', '03', '04', '05', '06', '07', '08']),
      theStandingAgreement,
    );
    expect(result.says).toMatch(/2 later payments outside the window/);
  });

  it('and the window runs from the FIRST PAYMENT, not from when the deal was signed', () => {
    /**
     * A client who signs in March and starts paying in July has six months from
     * July. Dating the window from the signature would quietly shorten what
     * somebody agreed to, by exactly the length of the delay - and the delay is
     * never the originator's doing.
     */
    const startedLate = monthly(['07', '08', '09', '10', '11', '12']);
    const result = originatorShareOf(startedLate, theStandingAgreement);
    expect(result.eligibleCash).toBe(6000);
  });

  it('and an agreement with no month limit covers everything', () => {
    const result = originatorShareOf(monthly(['01', '02', '03', '04', '05', '06', '07', '08']), {
      originatorSharePercent: 40,
      originatorShareMonths: null,
    });
    expect(result.eligibleCash).toBe(8000);
  });

  it('and a different agreed percentage is honoured rather than overridden', () => {
    /* The standing model is a default for the company, not a fact about a person. */
    const result = originatorShareOf(monthly(['01']), {
      originatorSharePercent: 15,
      originatorShareMonths: 6,
    });
    expect(result.originatorShare).toBe(150);
  });
});

describe('the standing technology model', () => {
  it('is 40 / 30 / 30, and adds to a hundred', () => {
    const m = TECHNOLOGY_REVENUE_MODEL;
    expect(m.originator).toBe(40);
    expect(m.originator + m.technicalDeliveryAndAdministration + m.groundworkCore).toBe(100);
  });

  it('and six months, which is what the originator share runs for', () => {
    expect(TECHNOLOGY_REVENUE_MODEL.originatorMonths).toBe(6);
  });

  it('but is not applied to anybody automatically', () => {
    /**
     * The model existing does not entitle anybody to it. This is the whole
     * point: a company-level default and a person's agreement are different
     * things, and the code must never reach for the first when the second is
     * absent.
     */
    const result = originatorShareOf(monthly(['01', '02']), null);
    expect(result.percent).toBeNull();
    expect(result.originatorShare).toBe(0);
  });
});
