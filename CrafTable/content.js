$(document).ready(function(e) {
    add(Items, ["Wood", types.material]);
    add(Items, ["Stone", types.material]);
    add(Items, ["Crafting Table", types.crafting]);
    add(Items, ["Wooden Pickaxe", types.material]);
    add(Recipes, [["Wood", "Wood",
                   "Wood", "Wood"],
                  "Crafting Table"]);
    add(Recipes, [["Wood", "Wood", "Wood",
                   null, "Wood", "Wood",
                   "Wood", null, "Wood"],
                  "Wooden Pickaxe",
                  "Crafting Table"]);
});