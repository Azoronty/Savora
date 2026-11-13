import type { Entry } from "../core";

/** Recipe titles, summaries, tags, amounts, staples and steps. */
export const RECIPES: Record<string, Entry> = {
  // Tags
  Breakfast: "Завтрак",
  Vegetarian: "Вегетарианское",
  Brunch: "Бранч",
  "One pan": "Одна сковорода",
  Quick: "Быстро",
  Comfort: "Уютное",
  "High protein": "Много белка",
  "One tray": "Один противень",
  Vegan: "Веганское",
  "Batch cook": "Впрок",
  "No cook": "Без готовки",
  Lunch: "Обед",

  // Amounts
  "2 handfuls": "2 горсти",
  "4 ripe tomatoes or 1 can": "4 спелых помидора или 1 банка",
  "2 cloves": "2 зубчика",
  "3 cloves": "3 зубчика",
  "a small handful": "небольшая горсть",
  "a handful": "горсть",
  "2 cups cooked": "2 стакана готового",
  "1 cup chopped": "1 стакан нарезанных",
  "½ cup": "½ стакана",
  "2 tbsp": "2 ст. л.",
  "3 tbsp": "3 ст. л.",
  "1 tsp": "1 ч. л.",
  "30 g grated": "30 г тёртого",
  "2 cups sliced": "2 стакана нарезанных",
  "2 cups": "2 стакана",
  "thumb-sized piece": "кусочек с палец",
  "to serve": "для подачи",
  "to drizzle": "полить",
  "2 sticks": "2 стебля",
  "1 stick": "1 стебель",
  "1 can": "1 банка",
  "2 cans": "2 банки",
  "1 small can": "1 маленькая банка",
  "1 can or 3 fresh": "1 банка или 3 свежих",
  "2 ripe": "2 спелых",
  "½ red onion": "½ красной луковицы",
  "2 fillets": "2 филе",
  "a few sprigs": "несколько веточек",
  "200 g cooked": "200 г готовой",
  "4 slices": "4 ломтика",
  "2 slices": "2 ломтика",
  "2 thick slices": "2 толстых ломтика",
  "a squeeze": "немного сока",
  "a pinch": "щепотка",
  "1 L stock or 1 can": "1 л бульона или 1 банка",
  "80 g small shapes": "80 г мелкой пасты",
  "1 head": "1 кочан",
  "a few leaves or 1 tbsp": "несколько листьев или 1 ст. л.",
  "2 portions": "2 порции",

  // Staples
  "Butter or oil": "Сливочное или растительное масло",
  Salt: "Соль",
  Pepper: "Перец",
  "Olive oil": "Оливковое масло",
  "Cumin or paprika": "Зира или паприка",
  Oil: "Растительное масло",
  "Dried herbs": "Сушёные травы",
  Cumin: "Зира",
  Water: "Вода",
  "Pinch of salt": "Щепотка соли",
  "Dried oregano": "Сушёный орегано",
  "Curry powder": "Карри",
  Butter: "Сливочное масло",
  "Pinch of cinnamon": "Щепотка корицы",

  // Spinach & feta omelette
  "Spinach & feta omelette": "Омлет со шпинатом и фетой",
  "A ten-minute fold that takes care of a whole bag of wilting spinach.": "Омлет за десять минут, который спасёт целую пачку вянущего шпината.",
  "Wilt the spinach in a little oil over medium heat, then tip it onto a plate.": "Потушите шпинат в капле масла на среднем огне, пока не опадёт, и переложите на тарелку.",
  "Beat the eggs with a pinch of salt and pepper.": "Взбейте яйца со щепоткой соли и перца.",
  "Pour the eggs into the pan, swirl, and let them set at the edges.": "Вылейте яйца на сковороду, распределите и дайте схватиться по краям.",
  "Scatter over the spinach, crumbled feta and sliced spring onion, fold and serve.": "Выложите шпинат, раскрошенную фету и зелёный лук, сложите омлет пополам и подавайте.",

  // Shakshuka
  "Weeknight shakshuka": "Шакшука на скорую руку",
  "Soft tomatoes and tired peppers become a rich sauce for poached eggs.": "Мягкие помидоры и уставший перец превращаются в густой соус для яиц.",
  "Soften the sliced onion and pepper in olive oil for 8 minutes.": "Обжарьте нарезанные лук и перец на оливковом масле 8 минут до мягкости.",
  "Add garlic and spices, then the chopped tomatoes. Simmer until thick, about 10 minutes.": "Добавьте чеснок и специи, затем нарезанные помидоры. Тушите до густоты около 10 минут.",
  "Make four wells, crack in the eggs, cover and cook until the whites set.": "Сделайте четыре углубления, разбейте в них яйца, накройте и готовьте, пока белок не схватится.",
  "Finish with feta and herbs. Serve with bread.": "Посыпьте фетой и зеленью. Подавайте с хлебом.",

  // Fried rice
  "Clear-the-fridge fried rice": "Жареный рис «Чистый холодильник»",
  "Built for leftover rice and the last of the vegetables.": "Для оставшегося риса и последних овощей.",
  "Stir-fry the chopped vegetables in a hot pan with oil for 3–4 minutes.": "Обжарьте нарезанные овощи на раскалённой сковороде с маслом 3–4 минуты.",
  "Push them aside, scramble the eggs in the gap.": "Сдвиньте их в сторону и пожарьте яйца-болтунью на свободном месте.",
  "Add the cold rice and peas, breaking up clumps, and fry until hot.": "Добавьте холодный рис и горошек, разбивая комочки, и жарьте до горячего.",
  "Season with soy sauce and finish with spring onion.": "Заправьте соевым соусом и посыпьте зелёным луком.",

  // Tomato pasta
  "Fresh tomato & basil pasta": "Паста со свежими помидорами и базиликом",
  "Ripe tomatoes collapse into a quick, bright sauce.": "Спелые помидоры быстро становятся ярким соусом.",
  "Cook the pasta in well-salted water.": "Отварите пасту в хорошо подсоленной воде.",
  "Meanwhile, warm sliced garlic in olive oil, add chopped tomatoes and cook down for 8 minutes.": "Тем временем прогрейте нарезанный чеснок в оливковом масле, добавьте помидоры и уварите 8 минут.",
  "Toss the drained pasta through the sauce with a splash of pasta water.": "Перемешайте пасту с соусом, добавив немного воды от варки.",
  "Tear in the basil and finish with cheese.": "Порвите базилик руками и посыпьте сыром.",

  // Mushroom pasta
  "Creamy mushroom pasta": "Паста со сливочно-грибным соусом",
  "Uses up mushrooms and the rest of a carton of cream.": "Использует грибы и остаток сливок.",
  "Cook the pasta.": "Отварите пасту.",
  "Fry the sliced mushrooms in a hot pan until golden, then add garlic.": "Обжарьте нарезанные грибы на горячей сковороде до золотистого цвета, затем добавьте чеснок.",
  "Pour in the cream and simmer for 2 minutes.": "Влейте сливки и прогрейте 2 минуты.",
  "Toss with pasta, cheese and parsley. Loosen with pasta water if needed.": "Смешайте с пастой, сыром и петрушкой. Если густо, добавьте воду от варки.",

  // Chicken stir-fry
  "Ginger chicken stir-fry": "Курица с имбирём в воке",
  "Fast, high heat, and happy with whatever vegetables you have.": "Быстро, на сильном огне и с любыми овощами, что есть.",
  "Cook the rice or noodles.": "Отварите рис или лапшу.",
  "Stir-fry the sliced chicken in a very hot pan until browned, then remove.": "Обжарьте нарезанную курицу на очень горячей сковороде до румяности и выньте.",
  "Fry the vegetables with garlic and ginger for 3 minutes.": "Обжарьте овощи с чесноком и имбирём 3 минуты.",
  "Return the chicken, add soy sauce, toss and serve.": "Верните курицу, добавьте соевый соус, перемешайте и подавайте.",

  // Traybake
  "Roast vegetable traybake": "Овощи, запечённые на противне",
  "One tray, every vegetable that needs using, very little effort.": "Один противень, все овощи, которые пора использовать, и минимум усилий.",
  "Heat the oven to 210°C / 410°F.": "Разогрейте духовку до 210 °C.",
  "Cut everything into even chunks and toss with oil, salt and herbs.": "Нарежьте всё одинаковыми кусками и перемешайте с маслом, солью и травами.",
  "Roast for 35–40 minutes, turning once, until golden at the edges.": "Запекайте 35–40 минут, один раз перевернув, до золотистых краёв.",
  "Crumble over feta for the last 5 minutes.": "За 5 минут до готовности раскрошите сверху фету.",

  // Lentil soup
  "Red lentil & vegetable soup": "Суп из красной чечевицы с овощами",
  "A thrifty pot that welcomes soft carrots and celery.": "Экономный суп, в который пойдут мягкая морковь и сельдерей.",
  "Soften chopped onion, carrot and celery in oil for 8 minutes.": "Обжарьте нарезанные лук, морковь и сельдерей в масле 8 минут до мягкости.",
  "Add garlic and cumin, then lentils, tomatoes and 1 L water.": "Добавьте чеснок и зиру, затем чечевицу, помидоры и 1 л воды.",
  "Simmer for 25 minutes until the lentils break down.": "Варите 25 минут, пока чечевица не разварится.",
  "Blend partly if you like, season and finish with lemon.": "По желанию частично пробейте блендером, посолите и добавьте лимонный сок.",

  // Pancakes
  "Banana oat pancakes": "Бананово-овсяные панкейки",
  "The best thing to happen to a spotty banana.": "Лучшее, что может случиться с бананом в пятнышках.",
  "Mash the bananas, then blend or whisk with oats, eggs and milk.": "Разомните бананы, затем смешайте блендером или венчиком с хлопьями, яйцами и молоком.",
  "Rest the batter for 5 minutes.": "Дайте тесту постоять 5 минут.",
  "Cook small pancakes in a buttered pan, 2 minutes per side.": "Жарьте небольшие панкейки на сковороде со сливочным маслом по 2 минуты с каждой стороны.",
  "Serve with berries or yogurt.": "Подавайте с ягодами или йогуртом.",

  // Overnight oats
  "Overnight oats": "Ленивая овсянка",
  "Five minutes tonight; uses yogurt and soft berries.": "Пять минут вечером; использует йогурт и мягкие ягоды.",
  "Stir the oats with milk or yogurt in a jar.": "Смешайте хлопья с молоком или йогуртом в банке.",
  "Top with berries and honey, cover and refrigerate overnight.": "Сверху выложите ягоды и мёд, закройте и уберите в холодильник на ночь.",

  // Village salad
  "Village salad": "Деревенский салат",
  "No cooking, just good tomatoes, crisp cucumber and feta.": "Без готовки: хорошие помидоры, хрустящий огурец и фета.",
  "Cut the tomatoes and cucumber into chunks and slice the onion thinly.": "Нарежьте помидоры и огурец крупно, а лук — тонко.",
  "Toss with salt, oregano and a generous pour of olive oil.": "Перемешайте с солью, орегано и щедро полейте оливковым маслом.",
  "Lay the feta on top and serve.": "Выложите сверху фету и подавайте.",

  // Salmon
  "Salmon with lemony potatoes": "Лосось с лимонным картофелем",
  "A simple roast for fish that should be cooked today.": "Простое запекание для рыбы, которую нужно приготовить сегодня.",
  "Heat the oven to 200°C / 400°F. Halve the potatoes and roast with oil for 20 minutes.": "Разогрейте духовку до 200 °C. Разрежьте картофель пополам и запекайте с маслом 20 минут.",
  "Nestle in the salmon with lemon slices and garlic.": "Выложите между картофелем лосось с ломтиками лимона и чесноком.",
  "Roast 12 more minutes until the fish flakes.": "Запекайте ещё 12 минут, пока рыба не начнёт распадаться на слои.",
  "Scatter with dill and squeeze over lemon.": "Посыпьте укропом и сбрызните лимонным соком.",

  // Quesadillas
  "Chicken quesadillas": "Кесадильи с курицей",
  "Crisp tortillas around cooked chicken, cheese and peppers.": "Хрустящие тортильи с готовой курицей, сыром и перцем.",
  "Fry the sliced pepper and onion until soft; add the chicken to warm through.": "Обжарьте перец и лук до мягкости; добавьте курицу и прогрейте.",
  "Fill half of each tortilla with the mix and cheese, then fold.": "Выложите начинку и сыр на половину каждой тортильи и сложите.",
  "Toast in a dry pan for 2–3 minutes per side until golden.": "Подрумяньте на сухой сковороде по 2–3 минуты с каждой стороны.",

  // Frittata
  "Everything frittata": "Фриттата из всего",
  "Eggs hold together the odds and ends from the crisper drawer.": "Яйца соберут вместе остатки из овощного ящика.",
  "Soften the onion and vegetables in an ovenproof pan.": "Обжарьте лук и овощи до мягкости на сковороде, которую можно ставить в духовку.",
  "Beat the eggs with cheese, salt and pepper and pour over.": "Взбейте яйца с сыром, солью и перцем и залейте овощи.",
  "Cook gently for 6 minutes, then finish under the grill until set.": "Готовьте на слабом огне 6 минут, затем доведите под грилем до готовности.",

  // Tuna pasta salad
  "Tuna & sweetcorn pasta salad": "Салат с пастой, тунцом и кукурузой",
  "A pantry lunch with a crunchy cucumber lift.": "Обед из кладовой со свежим хрустящим огурцом.",
  "Cook and cool the pasta.": "Отварите и остудите пасту.",
  "Mix with drained tuna, sweetcorn and diced cucumber.": "Смешайте с тунцом без жидкости, кукурузой и нарезанным огурцом.",
  "Dress with lemon, olive oil or a spoon of yogurt.": "Заправьте лимонным соком, оливковым маслом или ложкой йогурта.",

  // Curry
  "Chickpea & coconut curry": "Карри с нутом и кокосовым молоком",
  "Gentle and forgiving; stir in any greens at the end.": "Мягкое и неприхотливое; в конце можно добавить любую зелень.",
  "Soften the onion, then add garlic, ginger and curry powder for a minute.": "Обжарьте лук до мягкости, затем на минуту добавьте чеснок, имбирь и карри.",
  "Add tomatoes, chickpeas and coconut milk; simmer for 15 minutes.": "Добавьте помидоры, нут и кокосовое молоко; тушите 15 минут.",
  "Stir in spinach until wilted. Serve with rice.": "Вмешайте шпинат, пока он не опадёт. Подавайте с рисом.",

  // French toast
  "French toast with berries": "Гренки с ягодами",
  "Day-old bread is better here than fresh.": "Вчерашний хлеб здесь лучше свежего.",
  "Whisk the eggs, milk and cinnamon in a shallow dish.": "Взбейте яйца, молоко и корицу в неглубокой миске.",
  "Soak each slice for 20 seconds per side.": "Обмакните каждый ломтик на 20 секунд с каждой стороны.",
  "Fry in butter until golden, 2–3 minutes per side.": "Обжарьте на сливочном масле до золотистого цвета, 2–3 минуты с каждой стороны.",
  "Top with berries and honey.": "Подавайте с ягодами и мёдом.",

  // Avocado toast
  "Avocado toast with a fried egg": "Тост с авокадо и яичницей",
  "For the avocado that is ripe right now.": "Для авокадо, которое созрело прямо сейчас.",
  "Toast the bread and fry the egg.": "Подсушите хлеб и пожарьте яйцо.",
  "Mash the avocado with lemon and salt.": "Разомните авокадо с лимонным соком и солью.",
  "Spread on toast, top with the egg and chili.": "Намажьте на тост, сверху выложите яйцо и чили.",

  // Ragù
  "Slow beef ragù": "Томлёное рагу из говядины",
  "Soft carrots and celery give it depth; freezes well.": "Мягкая морковь и сельдерей придают глубину вкуса; хорошо замораживается.",
  "Finely chop the onion, carrot and celery and soften in oil for 10 minutes.": "Мелко нарежьте лук, морковь и сельдерей и обжарьте в масле 10 минут до мягкости.",
  "Add the beef and brown well, then the garlic.": "Добавьте говядину и хорошо обжарьте, затем чеснок.",
  "Add tomatoes and a splash of water; simmer, partly covered, for 40 minutes.": "Добавьте помидоры и немного воды; тушите под приоткрытой крышкой 40 минут.",
  "Serve over pasta. Freeze extra portions.": "Подавайте с пастой. Лишние порции заморозьте.",

  // Minestrone
  "Odds & ends minestrone": "Минестроне из остатков",
  "A loose, generous soup for half vegetables and small pasta.": "Щедрый суп для половинок овощей и мелкой пасты.",
  "Soften onion, carrot and celery in oil.": "Обжарьте лук, морковь и сельдерей в масле до мягкости.",
  "Add stock or tomatoes plus water, bring to a simmer.": "Добавьте бульон или помидоры с водой и доведите до кипения.",
  "Add pasta and chopped vegetables; cook for 10–12 minutes.": "Добавьте пасту и нарезанные овощи; варите 10–12 минут.",
  "Stir in beans and season well.": "Вмешайте фасоль и хорошо приправьте.",

  // Smoothie
  "Berry & banana smoothie": "Смузи с ягодами и бананом",
  "Rescues soft fruit in two minutes.": "Спасает мягкие фрукты за две минуты.",
  "Blend everything until smooth.": "Взбейте всё в блендере до однородности.",
  "Freeze chopped overripe bananas in advance for a thicker smoothie.": "Для густого смузи заранее заморозьте нарезанные перезрелые бананы.",

  // Gratin
  "Broccoli & cheese gratin": "Брокколи, запечённая с сыром",
  "Turns a yellowing head of broccoli into a bubbling side.": "Превращает желтеющую брокколи в горячий гарнир.",
  "Heat the oven to 200°C / 400°F. Blanch the broccoli florets for 3 minutes.": "Разогрейте духовку до 200 °C. Бланшируйте соцветия брокколи 3 минуты.",
  "Melt the butter, stir in flour, then whisk in milk until thick. Add most of the cheese.": "Растопите масло, вмешайте муку, затем влейте молоко и мешайте до загустения. Добавьте бо́льшую часть сыра.",
  "Pour over the broccoli in a dish, top with the remaining cheese.": "Залейте брокколи в форме соусом и посыпьте оставшимся сыром.",
  "Bake for 20 minutes until golden.": "Запекайте 20 минут до золотистой корочки.",

  // Caprese toast
  "Caprese toast": "Тост капрезе",
  "Mozzarella has a short life once opened. This is its best use.": "Открытая моцарелла живёт недолго. Вот лучший способ её использовать.",
  "Toast the bread and drizzle with olive oil.": "Подсушите хлеб и сбрызните оливковым маслом.",
  "Layer sliced tomato and mozzarella, season with salt.": "Выложите слоями помидор и моцареллу, посолите.",
  "Finish with basil or a spoon of pesto.": "Добавьте базилик или ложку песто.",

  // Shrimp noodles
  "Garlic shrimp noodles": "Лапша с креветками и чесноком",
  "Freezer shrimp and pantry noodles, dinner in twenty minutes.": "Креветки из морозилки и лапша из кладовой — ужин за двадцать минут.",
  "Cook the noodles and drain.": "Отварите лапшу и откиньте.",
  "Fry garlic and chili in oil for 30 seconds, add shrimp and cook until pink.": "Обжарьте чеснок и чили в масле 30 секунд, добавьте креветки и готовьте, пока не порозовеют.",
  "Toss in the noodles and soy sauce, finish with spring onion.": "Добавьте лапшу и соевый соус, посыпьте зелёным луком.",
};
