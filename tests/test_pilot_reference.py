import unittest

from scripts.pilot_reference import extract, scrape


def product(**overrides):
    fields = {
        'Country of Origin': 'Japan', 'Limited Edition': 'No',
        'Dry Time': '20 Seconds (Pilot Vanishing Point Medium Nib on Rhodia Paper)',
        'Flow': 'Average', 'Shading': 'Medium',
        'Sheen': 'Low pink sheen on Tomoe River paper', 'Shimmer': 'No',
        'Water Resistance': 'Medium', 'Iron Gall': 'No', 'Pigment': 'No',
        **overrides,
    }
    return {
        'title': 'Pilot Iroshizuku Rikka Ink', 'handle': 'pilot-iroshizuku-rikka-ink',
        'body_html': '<table>' + ''.join(
            f'<tr><td><strong>{key}</strong></td><td><p>{value}</p></td></tr>'
            for key, value in fields.items()
        ) + '</table>',
    }


class PilotScraperTest(unittest.TestCase):
    def test_normalizes_table_without_losing_test_conditions(self):
        writing = extract(product())['writing']
        self.assertEqual(writing['dryTimeSeconds'], 20)
        self.assertEqual(writing['flow'], 'average')
        self.assertEqual(writing['testPaper'], 'Rhodia')
        self.assertEqual(writing['sheen'], 'Low pink sheen on Tomoe River paper')
        self.assertIs(writing['shimmer'], False)

    def test_changed_conditions_and_unknown_values_require_review(self):
        for field, value in [('Dry Time', '20 seconds on unknown paper'), ('Shimmer', 'Unknown')]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                extract(product(**{field: value}))

    def test_missing_and_duplicate_products_do_not_silently_match(self):
        inventory = [{'id': 'owned', 'brand': 'Pilot', 'collection': 'Iroshizuku', 'name': 'Rikka'}]
        self.assertEqual(scrape([product()], inventory)[0]['inkId'], 'owned')
        for products in [[], [product(), product()]]:
            with self.assertRaises(ValueError):
                scrape(products, inventory)


if __name__ == '__main__':
    unittest.main()
