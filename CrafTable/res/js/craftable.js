// types
var types = {
    material: 1,
    crafting: 2
};
// items
function Item(name, type, props) {
    this.name = name;
    this.type = type;
    for (var attr in props) {
        this[attr] = props[attr];
    };
}
var Items = new (function Items() {
    this.type = Item;
    this.add = function add(item) {
        this[item.name] = item;
    }
})();
// recipes
var Recipe = function Recipe(input, output, table) {
    this.input = input;
    this.output = output;
    this.table = table;
};
var Recipes = new (function Recipes() {
    this.type = Recipe;
    this.add = function add(recipe) {
        if (typeof this[recipe.output] === "undefined") {
            this[recipe.output] = [];
        }
        this[recipe.output].push(recipe);
    }
});
// constructor
function add(collection, args) {
    var obj = Object.create(collection.type.prototype);
    collection.type.apply(obj, args);
    collection.add(obj);
    return obj;
}
$(document).ready(function docReady(e) {
    var pickupItem;
    function initItemEvents($items) {
        $items.on("mouseup", function itemMouseDown(e) {
            if (e.which === 1) {
                var parent = $(e.target).parent();
                var isIn = parent.is($("#craft-input div.slot"));
                var isOut = parent.is($("#craft-output.slot"));
                // left-click on item, already holding items of same type
                // => drop all, combine stacks
                if (pickupItem && $(this).attr("data-item") === pickupItem.item && !isOut) {
                    $(this).attr("data-stack", parseInt($(this).attr("data-stack")) + pickupItem.stack);
                    pickupItem = null;
                    $("#pickup").hide();
                    $(this).tooltip("show");
                }
                // left-click on item, already holding items of different type
                // => swap slot and pickup
                else if (pickupItem && $(this).attr("data-item") !== pickupItem.item && !isOut) {
                    var newPickupItem = {
                        item: $(this).attr("data-item"),
                        stack: parseInt($(this).attr("data-stack"))
                    };
                    $(this).attr("data-item", pickupItem.item).attr("data-stack", pickupItem.stack);
                    pickupItem = newPickupItem;
                    var text = pickupItem.item;
                    if (pickupItem.stack > 1) {
                        text += " (" + pickupItem.stack + ")";
                    }
                    $("#pickup-text").text(text);
                    $(this).tooltip("show");
                    if (isIn) {
                        checkCraftInput();
                    }
                }
                // left-click on item, not holding any items
                // => pick up all
                else if (!pickupItem) {
                    pickupItem = {
                        item: $(this).attr("data-item"),
                        stack: isOut ? doCraft(true) : parseInt($(this).attr("data-stack"))
                    };
                    parent.empty();
                    var text = pickupItem.item;
                    if (pickupItem.stack > 1) {
                        text += " (" + pickupItem.stack + ")";
                    }
                    $("#pickup-text").text(text);
                    $("#pickup").show();
                    if (isIn) {
                        checkCraftInput();
                    }
                    checkTables();
                }
                e.stopPropagation();
                e.preventDefault();
            }
        }).on("contextmenu", function itemContextMenu(e) {
            // right-click on item, already holding items of the same type
            // => pick up one
            if (!pickupItem || pickupItem.item === $(this).attr("data-item")) {
                var parent = $(e.target).parent();
                var isIn = parent.is($("#craft-input div.slot"));
                var isOut = parent.is($("#craft-output.slot"));
                e.stopPropagation();
                e.preventDefault();
                if (pickupItem) {
                    pickupItem.stack++;
                    $("#pickup-text").text(pickupItem.item + " (" + pickupItem.stack + ")");
                } else {
                    pickupItem = {
                        item: $(this).attr("data-item"),
                        stack: 1
                    };
                    $("#pickup-text").text(pickupItem.item);
                    $("#pickup").show();
                }
                var stack = parseInt($(this).attr("data-stack")) - 1;
                $(this).attr("data-stack", stack);
                if (stack) {
                    $(this).tooltip("show");
                } else {
                    parent.empty();
                }
                if (isIn) {
                    checkCraftInput();
                } else if (isOut) {
                    doCraft();
                }
                checkTables();
            }
        }).tooltip({
            title: function itemTooltipTitle() {
                var text = $(this).attr("data-item");
                var stack = parseInt($(this).attr("data-stack"));
                if (stack > 1) {
                    text += " (" + stack + ")";
                }
                return text;
            },
            placement: "bottom"
        });
    }
    function initSlotEvents($slots) {
        $slots.on("mouseup", function slotMouseUp(e) {
            var isIn = $(this).is($("#craft-input div.slot"));
            var isOut = $(this).is($("#craft-output.slot"));
            // left-click on empty slot, holding items
            // => drop all items in slot
            if (e.which === 1 && $(this).children().length === 0 && pickupItem && !isOut) {
                e.preventDefault();
                var item = $("<div/>").addClass("item").attr("data-item", pickupItem.item).attr("data-stack", pickupItem.stack);
                pickupItem = null;
                $("#pickup").hide();
                $(this).append(item);
                initItemEvents(item);
                if (isIn) {
                    checkCraftInput();
                }
                checkTables();
            }
        }).on("contextmenu", function slotContentMenu(e) {
            var isIn = $(this).is($("#craft-input div.slot"));
            var isOut = $(this).is($("#craft-output.slot"));
            // right-click on empty slot, holding items
            // => drop one item in slot
            if ($(this).children().length === 0 && pickupItem && !isOut) {
                var item = $("<div/>").addClass("item").attr("data-item", pickupItem.item).attr("data-stack", 1);
                pickupItem.stack--;
                if (pickupItem.stack) {
                    var text = pickupItem.item;
                    if (pickupItem.stack > 1) {
                        text += " (" + pickupItem.stack + ")";
                    }
                    $("#pickup-text").text(text);
                } else {
                    pickupItem = null;
                    $("#pickup").hide();
                }
                $(this).append(item);
                initItemEvents(item);
                if (isIn) {
                    checkCraftInput();
                }
                checkTables();
            }
        });
    }
    function initMenuEvents() {
        $("#menu-opts a").on("click", function menuClick(e) {
            var item = $(this).text();
            $("#menu-select").text(item);
            var size = item === "Hands" ? [2, 2] : Items[item].size;
            var grid = $("<div id='craft-input'/>");
            for (var i = 0; i < size[0]; i++) {
                var row = $("<div class='row'/>");
                for (var j = 0; j < size[1]; j++) {
                    row.append("<div class='slot img-thumbnail'/>");
                }
                grid.append(row);
            }
            $("#craft-input").replaceWith(grid);
            initSlotEvents($("#craft-input div.slot"));
        });
    }
    function checkTables() {
        var tables = {"Hands": true};
        for (var item in Items) {
            if (Items[item].type === types.crafting) {
                tables[item] = false;
            }
        }
        $("#inventory-grid div.slot").each(function(index, slot) {
            if ($(slot).children().length) {
                var item = $($(slot).children()[0]).attr("data-item");
                for (var table in tables) {
                    if (item === table) {
                        tables[table] = true;
                        break;
                    }
                }
            }
        });
        var menu = $("<ul id='menu-opts' class='dropdown-menu' role='menu'/>");
        for (var table in tables) {
            if (tables[table]) {
                menu.append("<li><a>" + table + "</a></li>");
            }
        }
        $("#menu-opts").replaceWith(menu);
        initMenuEvents();
    }
    function checkCraftInput() {
        var recipe = [];
        $("#craft-input div.slot").each(function(index, slot) {
            if ($(slot).children().length) {
                recipe.push($($(slot).children()[0]).attr("data-item"));
            } else {
                recipe.push(null);
            }
        });
        var recipeStr = recipe.join("|");
        $("#craft-output").empty();
        for (var item in Recipes) {
            if (typeof Recipes[item] === "object") {
                for (var i in Recipes[item]) {
                    if (Recipes[item][i].input.join("|") === recipeStr) {
                        var item = $("<div/>").addClass("item").attr("data-item", item).attr("data-stack", 1);
                        $("#craft-output").append(item);
                        initItemEvents(item);
                        break;
                    }
                }
            }
        }
    }
    function doCraft(multi, count) {
        if (!count) {
            count = 1;
        }
        var emptied = false;
        $("#craft-input div.slot").each(function(index, slot) {
            if ($(slot).children().length) {
                var item = $($(slot).children()[0]);
                item.attr("data-stack", parseInt(item.attr("data-stack")) - 1);
                if (parseInt(item.attr("data-stack")) === 0) {
                    $(slot).empty();
                    emptied = true;
                }
            }
        });
        if (multi) {
            if (emptied) {
                checkCraftInput();
                return count;
            } else {
                return doCraft(true, count + 1);
            }
        } else {
            checkCraftInput();
        }
    }
    $(document).on("mousemove", function docMouseMove(e) {
        if (pickupItem) {
            $("#pickup").css({
                left: e.pageX + 12,
                top: e.pageY + 12
            });
        }
    }).on("contextmenu", function docContextMenu(e) {
        e.preventDefault();
    });    
    initItemEvents($("div.item"));
    initSlotEvents($("div.slot"));
});
